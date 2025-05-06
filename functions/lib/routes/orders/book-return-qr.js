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
const calculateDistance_1 = require("../../utils/calculateDistance");
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:orderId/book-return-qr
 * @desc    Merchant books rider to deliver laundry back to customer using QR
 * @access  Authenticated (merchant only)
 */
router.post("/:orderId/book-return-qr", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const merchantId = req.user?.uid;
        if (!merchantId)
            return res.status(401).json({ error: "Unauthorized" });
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists)
            return res.status(404).json({ error: "Order not found." });
        const order = orderSnap.data();
        if (!order || order.merchantId !== merchantId) {
            return res.status(403).json({ error: "Not authorized for this order." });
        }
        if (order.orderType !== "Delivery") {
            return res.status(400).json({ error: "Order is not of delivery type." });
        }
        const customerLocation = order.customerLocation;
        const merchantLocation = order.merchantLocation;
        if (!customerLocation?.latitude || !merchantLocation?.latitude) {
            return res.status(400).json({ error: "Missing coordinates for delivery fee calculation." });
        }
        // 📦 Calculate distance + rider fee
        const distance = (0, calculateDistance_1.calculateDistance)(merchantLocation.latitude, merchantLocation.longitude, customerLocation.latitude, customerLocation.longitude);
        const baseFare = 49;
        const distanceFee = Math.ceil(distance / 5) * 30;
        const riderFee = baseFare + distanceFee;
        const platformFee = parseFloat((riderFee * 0.2).toFixed(2));
        // 📌 Generate new QR
        const payload = {
            orderId,
            type: "return_delivery_qr",
        };
        const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(payload));
        // 🔐 Save QR to subcollection
        const secureQrRef = orderRef.collection("deliveryBackBooking").doc("secureQr");
        await secureQrRef.set({
            qrCode: qrCodeDataURL,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            type: "return_delivery_qr",
        });
        // ✏️ Update order main document
        await orderRef.update({
            status: "awaiting_rider_return",
            returnDeliveryFee: riderFee,
            returnDeliveryPlatformFee: platformFee,
            returnQRGenerated: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({
            message: "Return QR generated and saved to subcollection.",
            distance: `${distance.toFixed(2)} km`,
            riderFee,
            platformFee,
            qrPath: `orders/${orderId}/deliveryBackBooking/secureQr`,
        });
    }
    catch (err) {
        console.error("❌ Error booking return QR:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=book-return-qr.js.map