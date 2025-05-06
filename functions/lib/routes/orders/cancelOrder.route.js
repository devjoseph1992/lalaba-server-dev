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
 * @route   POST /orders/:orderId/cancel
 * @desc    Cancel an order (merchant or customer) if not yet accepted or expired payment
 * @access  Authenticated
 */
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
        // ❌ Block if already delivered or cancelled
        if (["cancelled", "delivered"].includes(order.status)) {
            return res.status(400).json({ error: `Order is already ${order.status}.` });
        }
        // ❌ Block cancellation if already accepted
        if (order.status === "accepted_by_merchant") {
            return res.status(400).json({
                error: "Cannot cancel an order that has already been accepted by the merchant.",
            });
        }
        // ✅ Additional check: if awaiting_payment, check if expired
        if (order.status === "awaiting_payment") {
            const expiresAt = order.expiresAt?.toDate?.();
            const now = new Date();
            if (expiresAt && now > expiresAt) {
                return res.status(400).json({
                    error: "Payment window has already expired. Please wait for automatic cancellation.",
                });
            }
        }
        await orderRef.update({
            status: "cancelled",
            cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
            cancelledBy: isMerchant ? "merchant" : "customer",
        });
        return res.status(200).json({
            message: `Order cancelled by ${isMerchant ? "merchant" : "customer"}.`,
        });
    }
    catch (err) {
        console.error("❌ Error cancelling order:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=cancelOrder.route.js.map