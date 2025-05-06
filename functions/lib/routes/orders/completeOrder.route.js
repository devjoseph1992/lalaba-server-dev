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
const walletService_1 = require("../../services/walletService");
const router = (0, express_1.Router)();
router.post("/order/:orderId/complete-order", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const order = orderSnap.data();
        if (!order || !order.merchantId || !order.riderId) {
            return res.status(400).json({ error: "Invalid order data. Missing merchant or rider info." });
        }
        await (0, walletService_1.collectHeldAmount)(order.merchantId, "merchant");
        await (0, walletService_1.collectHeldAmount)(order.riderId, "rider");
        await orderRef.update({
            status: "completed",
            completedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({
            message: "Order completed. Platform fees collected.",
        });
    }
    catch (err) {
        console.error("❌ Error completing order:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=completeOrder.route.js.map