"use strict";
// functions/src/routes/fare.ts
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../middleware/auth");
const encryption_1 = require("../utils/encryption");
const router = (0, express_1.Router)();
/**
 * ✅ Calculate Distance (Haversine Formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (deg) => (deg * Math.PI) / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};
/**
 * ✅ Rider Picks Up the Order (Deduct 20% Fee & Hold Until Completion)
 */
router.post("/pickup", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId, customerLocation, merchantId } = req.body;
        const riderId = req.user?.uid;
        if (!riderId || !orderId || !customerLocation || !merchantId) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        // ✅ Fetch Merchant Location
        const merchantRef = admin.firestore().collection("users").doc(merchantId);
        const merchantSnapshot = await merchantRef.get();
        if (!merchantSnapshot.exists) {
            return res.status(404).json({ error: "Merchant not found." });
        }
        const merchantLocation = merchantSnapshot.data()?.location;
        if (!merchantLocation?.latitude || !merchantLocation?.longitude) {
            return res.status(400).json({ error: "Merchant location is missing." });
        }
        // ✅ Calculate Distance (Customer → Merchant)
        const distance = calculateDistance(customerLocation.latitude, customerLocation.longitude, merchantLocation.latitude, merchantLocation.longitude);
        // ✅ Calculate Fare
        const baseFare = 49;
        const additionalDistanceFee = Math.ceil(distance / 5) * 30; // ₱30 per 5km
        const totalFare = baseFare + additionalDistanceFee;
        const platformFee = totalFare * 0.2; // 20% Platform Fee
        console.log(`✅ Distance: ${distance.toFixed(2)} km | Fare: ₱${totalFare} | Platform Fee: ₱${platformFee}`);
        // ✅ Fetch Rider's Wallet
        const walletRef = admin.firestore().collection("wallets").doc(riderId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists) {
            return res.status(404).json({ error: "Rider wallet not found." });
        }
        const walletData = walletSnapshot.data();
        const currentBalance = parseFloat((0, encryption_1.decrypt)(walletData.balance));
        if (currentBalance < platformFee) {
            return res.status(400).json({ error: "Insufficient wallet balance to cover platform fee." });
        }
        const newBalance = currentBalance - platformFee;
        // ✅ Deduct 20% Platform Fee & Hold Until Order Completion
        await walletRef.update({
            balance: (0, encryption_1.encrypt)(newBalance.toString()),
            holdAmount: (0, encryption_1.encrypt)(platformFee.toString()),
            holdUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000) // Hold for 30 mins
            ),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // ✅ Update Order Status
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        await orderRef.update({
            status: "picked_up",
            riderId,
            platformFee,
            holdUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Platform Fee ₱${platformFee} deducted & held until order completion for Rider ${riderId}.`);
        return res.status(200).json({
            message: `Order picked up. Platform fee of ₱${platformFee} deducted and on hold.`,
            totalFare,
            platformFee,
            newBalance,
        });
    }
    catch (error) {
        console.error("❌ Error processing pickup:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=fare.js.map