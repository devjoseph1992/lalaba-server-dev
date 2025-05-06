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
const sendOrderStatusNotification_1 = require("../../utils/sendOrderStatusNotification"); // <-- ✅ import
const router = (0, express_1.Router)();
/**
 * @route   POST /orders/:orderId/set-completion-time
 * @desc    Merchant sets completion time after laundry is ready (only for delivery-type orders)
 * @access  Authenticated (Merchant only)
 */
router.post("/:orderId/set-completion-time", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { completionTime } = req.body;
        const merchantId = req.user?.uid;
        if (!merchantId) {
            return res.status(401).json({ error: "Unauthorized: Missing merchant ID." });
        }
        if (!completionTime) {
            return res.status(400).json({ error: "Missing completionTime in request body." });
        }
        const parsedTime = new Date(completionTime);
        if (isNaN(parsedTime.getTime())) {
            return res.status(400).json({ error: "Invalid date format for completionTime." });
        }
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const orderData = orderSnap.data();
        if (!orderData || orderData.merchantId !== merchantId) {
            return res.status(403).json({ error: "Not authorized to modify this order." });
        }
        if (orderData.status !== "delivered_by_rider" || orderData.orderType !== "Delivery") {
            return res.status(400).json({
                error: "You can only set completion time after delivery and for Delivery-type orders.",
            });
        }
        // ✅ Update order with completion info
        await orderRef.update({
            completionTime: parsedTime,
            completionStatus: "laundry_ready",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Merchant ${merchantId} set completion time for order ${orderId}`);
        // 🔥 Send notification to customer
        if (orderData.customerId) {
            await (0, sendOrderStatusNotification_1.sendOrderStatusNotification)(orderData.customerId, orderId, "laundry_ready");
        }
        return res.status(200).json({
            message: "Completion time set successfully.",
            orderId,
            completionTime: parsedTime.toISOString(),
        });
    }
    catch (err) {
        console.error("❌ Error setting completion time:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=set-completion-time.js.map