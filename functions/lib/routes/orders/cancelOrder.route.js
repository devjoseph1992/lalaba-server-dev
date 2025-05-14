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
const refundGcashPayment_1 = require("../../utils/refundGcashPayment");
const refundBankPayment_1 = require("../../utils/refundBankPayment");
const router = (0, express_1.Router)();
router.post("/:orderId/cancel", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.uid;
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || !order.merchantId || !order.customerId) {
            return res.status(400).json({ error: "Invalid order data." });
        }
        const isMerchant = order.merchantId === userId;
        const isCustomer = order.customerId === userId;
        if (!isMerchant && !isCustomer) {
            return res.status(403).json({ error: "You are not authorized to cancel this order." });
        }
        if (["cancelled", "delivered"].includes(order.status)) {
            return res.status(400).json({ error: `Order is already ${order.status}.` });
        }
        if (order.status === "accepted_by_merchant") {
            return res.status(400).json({
                error: "Cannot cancel an order that has already been accepted by the merchant.",
            });
        }
        if (order.status === "awaiting_payment") {
            const expiresAt = order.expiresAt?.toDate?.();
            if (expiresAt && new Date() > expiresAt) {
                return res.status(400).json({
                    error: "Payment window has already expired. Please wait for automatic cancellation.",
                });
            }
        }
        const chargeId = order.xenditChargeId;
        const amount = order.price;
        // ✅ Use Xendit-approved reason
        const xenditReason = "REQUESTED_BY_CUSTOMER";
        if (order.paymentStatus === "paid") {
            if (!chargeId || !amount) {
                return res.status(500).json({ error: "Missing chargeId or price for refund." });
            }
            try {
                if (order.paymentMethod === "GCash") {
                    await (0, refundGcashPayment_1.refundGcashPayment)({
                        chargeId,
                        amount,
                        reason: xenditReason,
                    });
                }
                if (order.paymentMethod === "Bank") {
                    await (0, refundBankPayment_1.refundBankPayment)({
                        chargeId,
                        amount,
                        reason: xenditReason,
                    });
                }
            }
            catch (refundError) {
                const rawError = refundError?.response?.data || refundError?.message || "Unknown refund error";
                console.error("❌ Refund failed:", rawError);
                return res.status(500).json({
                    error: `${order.paymentMethod} refund failed. Please contact support.`,
                    details: rawError,
                });
            }
        }
        // ✅ Final cancellation update
        await orderRef.update({
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: isMerchant ? "merchant" : "customer",
        });
        return res.status(200).json({
            message: `Order cancelled by ${isMerchant ? "merchant" : "customer"}. Refund issued if applicable.`,
        });
    }
    catch (err) {
        console.error("❌ Error cancelling order:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=cancelOrder.route.js.map