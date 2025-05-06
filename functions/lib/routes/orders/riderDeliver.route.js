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
// routes/order/deliver.ts
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../../middleware/auth");
const sendOrderStatusNotification_1 = require("../../utils/sendOrderStatusNotification");
const xenditRefund_1 = require("../../utils/xenditRefund"); // ✅ Important: Refund Helper
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:orderId/deliver
 * @desc    Rider submits delivery form after QR scan
 * @access  Authenticated (Riders only)
 */
router.post("/:orderId/deliver", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const riderId = req.user?.uid;
        const { actualWeight, photoUrls = [] } = req.body;
        if (!riderId) {
            return res.status(401).json({ error: "Unauthorized. Rider ID missing." });
        }
        if (!actualWeight || typeof actualWeight !== "number" || actualWeight <= 0) {
            return res.status(400).json({ error: "Invalid or missing actual weight." });
        }
        if (!Array.isArray(photoUrls)) {
            return res.status(400).json({ error: "photoUrls must be an array." });
        }
        // 🔍 Fetch Order
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || order.currentRiderId !== riderId) {
            return res.status(403).json({ error: "Not authorized to submit this delivery." });
        }
        // 🔒 Validate QR Scan
        const qrSnap = await orderRef.collection("secure").doc("qr").get();
        const qrData = qrSnap.data();
        const qrUsedAt = qrData?.usedAt?.toDate?.();
        const now = new Date();
        if (!qrUsedAt || now.getTime() - qrUsedAt.getTime() > 10 * 60 * 1000) {
            return res
                .status(403)
                .json({ error: "QR code expired. Please re-scan before submitting delivery." });
        }
        // 💵 Recalculate Final Price
        const pricePerKilo = typeof order.price === "string"
            ? parseFloat(order.price) / order.estimatedKilo
            : order.price / order.estimatedKilo;
        const recalculatedPrice = parseFloat((pricePerKilo * actualWeight + order.riderFee).toFixed(2));
        // 🔥 Prepare update payload
        const updatePayload = {
            actualWeight,
            deliveryPhotos: photoUrls,
            deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "delivered_by_rider",
            price: recalculatedPrice,
        };
        // 📦 Handle GCash adjustment
        if (order.paymentMethod === "GCash" && order.paymentStatus === "paid") {
            const oldPaidAmount = order.price;
            const overpaidAmount = parseFloat((oldPaidAmount - recalculatedPrice).toFixed(2));
            const underpaidAmount = parseFloat((recalculatedPrice - oldPaidAmount).toFixed(2));
            if (overpaidAmount > 0.01) {
                // 🛡 Refund customer the extra
                try {
                    await (0, xenditRefund_1.refundExcessPayment)({
                        paymentRequestId: order.paymentChargeId,
                        amount: overpaidAmount,
                    });
                    updatePayload.paymentStatus = "refunded";
                    updatePayload.refundAmount = overpaidAmount;
                    console.log(`✅ Refunded ₱${overpaidAmount} for Order: ${orderId}`);
                }
                catch (err) {
                    console.error("❌ Refund failed:", err.message);
                    return res.status(500).json({ error: "Refund failed", details: err.message });
                }
            }
            else if (underpaidAmount > 0.01) {
                // 🚨 Customer underpaid
                updatePayload.paymentStatus = "underpaid";
                updatePayload.additionalAmountDue = underpaidAmount;
                console.warn(`⚠️ Customer underpaid ₱${underpaidAmount} for Order: ${orderId}`);
            }
            else {
                // 🟰 Paid exactly correct amount
                updatePayload.paymentStatus = "paid";
            }
        }
        // 🔄 Update Firestore Order
        await orderRef.update(updatePayload);
        // 📢 Send Notification to Customer
        if (order.customerId) {
            await (0, sendOrderStatusNotification_1.sendOrderStatusNotification)(order.customerId, orderId, "delivered_by_rider");
        }
        return res.status(200).json({
            message: "✅ Delivery submitted successfully.",
            recalculatedPrice,
            updatedFields: updatePayload,
        });
    }
    catch (err) {
        console.error("❌ Failed to submit delivery:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=riderDeliver.route.js.map