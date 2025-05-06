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
// src/routes/orders/payTopup.route.ts
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../../middleware/auth");
const gcashPreorder_1 = require("../../utils/gcashPreorder");
const encryption_1 = require("../../utils/encryption");
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:orderId/pay-topup
 * @desc    Customer pays additional amount if order underpaid
 * @access  Authenticated (Customer only)
 */
router.post("/:orderId/pay-topup", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized." });
        }
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || order.customerId !== userId) {
            return res.status(403).json({ error: "Not authorized to pay for this order." });
        }
        if (order.paymentStatus !== "underpaid" ||
            !order.additionalAmountDue ||
            order.additionalAmountDue <= 0) {
            return res.status(400).json({ error: "This order has no pending top-up payment." });
        }
        // 🔍 Fetch customer's saved GCash number
        const paymentSnap = await admin
            .firestore()
            .collection("payment_methods")
            .where("userId", "==", userId)
            .limit(1)
            .get();
        if (paymentSnap.empty) {
            return res.status(400).json({ error: "No GCash number saved in payment methods." });
        }
        const gcashData = paymentSnap.docs[0].data();
        if (!gcashData.gcashNumber) {
            return res.status(400).json({ error: "GCash number is required." });
        }
        let customerPhone;
        try {
            customerPhone = (0, encryption_1.decrypt)(gcashData.gcashNumber);
        }
        catch {
            return res.status(500).json({ error: "Failed to decrypt GCash number." });
        }
        // ✅ Create GCash checkout for the additional amount
        const { checkoutUrl, referenceId } = await (0, gcashPreorder_1.createGcashPreorderPayment)({
            amount: parseFloat(order.additionalAmountDue.toFixed(2)),
            customerId: userId,
            customerPhone,
        });
        // 🛠️ Save the new top-up reference ID inside order
        await orderRef.update({
            topUpReferenceId: referenceId,
            topUpStatus: "pending",
            topUpCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(201).json({
            message: "Top-up GCash checkout created successfully",
            checkoutUrl,
            referenceId,
        });
    }
    catch (err) {
        console.error("❌ Error creating top-up payment:", err.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=payTopup.route.js.map