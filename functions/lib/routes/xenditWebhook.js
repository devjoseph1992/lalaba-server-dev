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
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const router = (0, express_1.Router)();
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN ?? "";
/**
 * ✅ Webhook for GCash Payment Status (Order Only)
 */
router.post("/webhook", async (req, res) => {
    try {
        const webhookData = req.body;
        console.log("📌 Xendit Webhook Event Received:", webhookData);
        // 🔐 Validate callback token
        const receivedToken = req.headers["x-callback-token"];
        if (!receivedToken || receivedToken !== XENDIT_CALLBACK_TOKEN) {
            console.error("❌ Invalid Xendit Callback Token");
            return res.status(401).json({ error: "Unauthorized webhook request" });
        }
        const { data } = webhookData;
        if (!data?.status || !data?.id || !data?.reference_id) {
            console.error("❌ Missing required webhook fields.");
            return res.status(400).json({ error: "Invalid webhook payload." });
        }
        // ✅ Process only successful payments
        if (data.status !== "SUCCEEDED") {
            console.log("ℹ️ Ignoring non-successful payment.");
            return res.status(200).send("Ignored");
        }
        const chargeId = data.id;
        const referenceId = data.reference_id; // e.g., preorder-lkfXMFwvPPKLm6gAk9Ug-iNU0TcuMddggrxe2BKS2TECyVOX2
        const parts = referenceId.split("-");
        if (parts.length < 3 || !referenceId.startsWith("preorder-")) {
            console.error("❌ Invalid reference_id format:", referenceId);
            return res.status(400).json({ error: "Invalid reference_id format" });
        }
        const orderId = parts[1];
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            console.error("❌ Order not found:", orderId);
            return res.status(404).json({ error: "Order not found." });
        }
        const orderData = orderSnap.data();
        if (!orderData) {
            console.error("❌ Order data is missing.");
            return res.status(500).json({ error: "Order data missing." });
        }
        // ✅ Update order status only
        await admin.firestore().runTransaction(async (tx) => {
            tx.update(orderRef, {
                paymentStatus: "paid",
                status: "pending",
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                xenditChargeId: chargeId,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            tx.set(admin.firestore().collection("xendit_webhooks").doc(chargeId), {
                chargeId,
                referenceId,
                amount: data.charge_amount,
                currency: data.currency,
                channelCode: data.channel_code,
                status: data.status,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        console.log(`✅ GCash payment recorded for order ${orderId}`);
        return res.status(200).json({ message: "GCash payment recorded for order." });
    }
    catch (err) {
        console.error("❌ Webhook handler error:", err);
        return res.status(500).json({ error: "Webhook processing failed." });
    }
});
exports.default = router;
//# sourceMappingURL=xenditWebhook.js.map