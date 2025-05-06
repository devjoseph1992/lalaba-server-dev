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
const sendOrderStatusNotification_1 = require("../../utils/sendOrderStatusNotification"); // <-- ✅ import here
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:orderId/complete-return
 * @desc    Rider completes the return delivery (final step)
 * @access  Authenticated (Rider only)
 */
router.post("/:orderId/complete-return", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { photoUrls = [] } = req.body;
        const riderId = req.user?.uid;
        if (!riderId) {
            return res.status(401).json({ error: "Unauthorized: No rider ID found." });
        }
        // Fetch the order
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || order.currentRiderId !== riderId) {
            return res.status(403).json({ error: "You are not authorized to complete this order." });
        }
        if (order.status !== "awaiting_rider_return") {
            return res.status(400).json({ error: "Order is not in a returnable state." });
        }
        // Store proof in subcollection
        const proofRef = orderRef.collection("deliveryBackBooking").doc("returnProof");
        await proofRef.set({
            photoUrls,
            completedBy: riderId,
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // Update order status to completed
        await orderRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Rider ${riderId} completed return delivery for order ${orderId}`);
        // 🔥 Send notification to customer
        if (order.customerId) {
            await (0, sendOrderStatusNotification_1.sendOrderStatusNotification)(order.customerId, orderId, "completed");
        }
        return res.status(200).json({
            message: "Order return completed successfully.",
            orderId,
            status: "completed",
        });
    }
    catch (err) {
        console.error("❌ Error completing return:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=complete-return.js.map