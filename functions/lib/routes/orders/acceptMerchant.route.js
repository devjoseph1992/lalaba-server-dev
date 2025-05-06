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
const QRCode = __importStar(require("qrcode"));
const auth_1 = require("../../middleware/auth");
const sendOrderStatusNotification_1 = require("../../utils/sendOrderStatusNotification"); // <-- import this
const router = (0, express_1.Router)();
router.post("/:orderId/accept-merchant", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const merchantId = req.user?.uid;
        if (!merchantId) {
            return res.status(401).json({ error: "Unauthorized: Missing merchant ID." });
        }
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || order.merchantId !== merchantId) {
            return res.status(403).json({ error: "Not authorized to accept this order." });
        }
        const estimatedPrice = typeof order.price === "string" ? parseFloat(order.price) : order.price;
        if (!estimatedPrice || isNaN(estimatedPrice)) {
            return res.status(400).json({ error: "Invalid order price." });
        }
        const platformFee = parseFloat((estimatedPrice * 0.2).toFixed(2));
        // ✅ Generate QR Code
        const qrPayload = {
            orderId,
            type: "delivery_verify",
        };
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrPayload));
        // ✅ Save QR Code securely
        const qrSecureRef = orderRef.collection("secure").doc("qr");
        await qrSecureRef.set({
            qrCode: qrCodeDataURL,
            type: "delivery_verify",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // ✅ Update order status
        await orderRef.update({
            status: "accepted_by_merchant",
            merchantAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
            platformFeeEstimate: platformFee,
            deliveryQRGenerated: true,
        });
        console.log(`✅ Order accepted: ${orderId} by ${merchantId} (QR saved to secure/)`);
        // 🔥 Send push notification to customer
        if (order.customerId) {
            await (0, sendOrderStatusNotification_1.sendOrderStatusNotification)(order.customerId, orderId, "accepted_by_merchant");
        }
        return res.status(200).json({
            message: "Order accepted, QR code generated, and notification sent.",
            platformFee,
            qrCodeStoredIn: `orders/${orderId}/secure/qr`,
        });
    }
    catch (err) {
        console.error("❌ Error accepting order:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=acceptMerchant.route.js.map