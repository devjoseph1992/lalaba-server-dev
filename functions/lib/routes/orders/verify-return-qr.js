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
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/verify-return-qr
 * @desc    Rider scans QR at merchant to start return delivery
 * @access  Authenticated (Rider only)
 */
router.post("/verify-return-qr", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { qrPayload } = req.body;
        const riderId = req.user?.uid;
        if (!qrPayload || typeof qrPayload !== "object" || qrPayload.type !== "return_delivery_qr") {
            return res.status(400).json({ error: "Invalid or missing QR payload." });
        }
        const { orderId } = qrPayload;
        if (!orderId) {
            return res.status(400).json({ error: "Missing orderId in QR payload." });
        }
        // 🔎 Validate order
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists)
            return res.status(404).json({ error: "Order not found." });
        const orderData = orderSnap.data();
        if (!orderData || orderData.returnCurrentRiderId !== riderId) {
            return res
                .status(403)
                .json({ error: "You are not the assigned return rider for this order." });
        }
        // 🔐 Get QR from secure location
        const qrSecureRef = orderRef.collection("deliveryBackBooking").doc("secureQr");
        const qrSnap = await qrSecureRef.get();
        if (!qrSnap.exists) {
            return res.status(404).json({ error: "QR code not found for this return delivery." });
        }
        const qrData = qrSnap.data();
        if (!qrData) {
            return res.status(404).json({ error: "QR data is missing or corrupted." });
        }
        if (qrData.usedAt) {
            return res.status(409).json({ error: "QR code has already been used." });
        }
        // ✅ Mark QR as used
        await qrSecureRef.update({
            usedAt: admin.firestore.FieldValue.serverTimestamp(),
            usedBy: riderId,
        });
        // ✅ Update order status
        await orderRef.update({
            status: "return_picked_up",
            returnPickupTime: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({
            message: "Return QR verified. Rider can proceed to deliver laundry to customer.",
            orderId,
        });
    }
    catch (err) {
        console.error("❌ Error verifying return QR:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=verify-return-qr.js.map