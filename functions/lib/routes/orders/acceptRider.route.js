"use strict";
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
const auth_1 = require("../../middleware/auth");
const sendOrderStatusNotification_1 = require("../../utils/sendOrderStatusNotification"); // <-- ✅ import correctly from utils!
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:id/accept
 * @desc    Rider accepts an order
 * @access  Authenticated
 */
router.post("/:id/accept", auth_1.verifyFirebaseToken, async (req, res) => {
    const { id: orderId } = req.params;
    const riderId = req.user?.uid;
    if (!riderId) {
        return res.status(401).json({ error: "Unauthorized. Rider not authenticated." });
    }
    try {
        // 1. Validate order
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists)
            return res.status(404).json({ error: "Order not found." });
        const orderData = orderSnap.data();
        if (!orderData)
            return res.status(404).json({ error: "Order data missing." });
        // 2. Get rider info
        const riderSnap = await admin.firestore().collection("users").doc(riderId).get();
        if (!riderSnap.exists)
            return res.status(404).json({ error: "Rider profile not found." });
        const riderData = riderSnap.data() || {};
        const name = `${riderData.firstName || ""} ${riderData.lastName || ""}`.trim();
        const plateNumber = riderData.plateNumber || "N/A";
        const vehicle = riderData.vehicleUnit || "Unknown";
        // 3. Save rider data in subcollection
        const timestamp = admin.firestore.FieldValue.serverTimestamp();
        const riderEntry = {
            riderId,
            name,
            plateNumber,
            vehicle,
            status: "accepted",
            acceptedAt: timestamp,
        };
        await orderRef.collection("riders").doc(riderId).set(riderEntry);
        // 4. Update main order doc
        await orderRef.update({
            currentRiderId: riderId,
            currentRiderName: name,
            currentRiderPlate: plateNumber,
            currentRiderVehicle: vehicle,
            status: "accepted_by_rider",
            acceptedAt: timestamp,
        });
        console.log(`✅ Rider ${riderId} accepted order ${orderId}`);
        // 5. 🔥 Send notification to customer
        if (orderData.customerId) {
            await (0, sendOrderStatusNotification_1.sendOrderStatusNotification)(orderData.customerId, orderId, "accepted_by_rider");
        }
        return res.status(200).json({ message: "✅ Order accepted", rider: riderEntry });
    }
    catch (err) {
        console.error("❌ Failed to accept order:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=acceptRider.route.js.map