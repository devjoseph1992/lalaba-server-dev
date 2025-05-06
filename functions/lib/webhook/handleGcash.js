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
exports.handleGcash = void 0;
const admin = __importStar(require("firebase-admin"));
const encryption_1 = require("../utils/encryption");
const xenditRefund_1 = require("../utils/xenditRefund");
const handleGcash = async (webhookData) => {
    try {
        const data = webhookData.data;
        const { reference_id, charge_amount, id: chargeId, status } = data;
        if (!reference_id || !charge_amount || !chargeId) {
            console.error("❌ Missing required GCash fields");
            return;
        }
        console.log(`📩 GCash webhook received`);
        console.log(`🔍 reference_id: ${reference_id}, chargeId: ${chargeId}, amount: ₱${charge_amount}, status: ${status}`);
        let orderId = "";
        let userId = "";
        // 🔍 Parse reference_id formats
        if (reference_id.startsWith("order-")) {
            const parts = reference_id.split("-");
            orderId = parts[1];
            userId = parts[3];
        }
        else if (reference_id.startsWith("preorder-")) {
            const parts = reference_id.split("-");
            orderId = parts[1];
            userId = parts[2]; // ✅ Optimized: userId from referenceId directly
            console.log(`📦 Order resolved: orderId=${orderId}, userId=${userId}`);
        }
        else {
            console.error("❌ Unsupported reference_id format:", reference_id);
            return;
        }
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const [walletSnap, orderSnap] = await Promise.all([walletRef.get(), orderRef.get()]);
        if (!walletSnap.exists) {
            console.error("❌ Wallet not found for user:", userId);
            return;
        }
        if (!orderSnap.exists) {
            console.error("❌ Order not found with ID:", orderId);
            return;
        }
        const wallet = walletSnap.data();
        const order = orderSnap.data();
        if (!order) {
            console.error("❌ Order document has no data:", orderId);
            return;
        }
        const { estimatedKilo = 0, actualKilo = null, price, riderFee } = order;
        const pricePerKilo = estimatedKilo > 0 ? price / estimatedKilo : 0;
        const finalPrice = actualKilo
            ? parseFloat((actualKilo * pricePerKilo + riderFee).toFixed(2))
            : price;
        const platformFee = charge_amount * 0.2;
        const net = charge_amount - platformFee;
        console.log(`🧮 Price breakdown:`);
        console.log(`• estimatedKilo: ${estimatedKilo}`);
        console.log(`• actualKilo: ${actualKilo}`);
        console.log(`• pricePerKilo: ₱${pricePerKilo}`);
        console.log(`• riderFee: ₱${riderFee}`);
        console.log(`• finalPrice (actual): ₱${finalPrice}`);
        console.log(`• chargedAmount: ₱${charge_amount}, platformFee: ₱${platformFee}, net: ₱${net}`);
        const oldBalance = parseFloat((0, encryption_1.decrypt)(wallet?.balance || "0"));
        let refundAmount = 0;
        // 💸 Refund if customer overpaid
        if (actualKilo && finalPrice < price) {
            refundAmount = parseFloat((price - finalPrice).toFixed(2));
            try {
                await (0, xenditRefund_1.refundExcessPayment)({
                    paymentRequestId: chargeId,
                    amount: refundAmount,
                });
                console.log(`💸 Refunded ₱${refundAmount} for order ${orderId}`);
            }
            catch (refundErr) {
                console.error("❌ Refund failed:", refundErr.message);
                return;
            }
        }
        await admin.firestore().runTransaction(async (t) => {
            t.update(walletRef, {
                balance: (0, encryption_1.encrypt)((oldBalance + net).toFixed(2)),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            t.update(orderRef, {
                status: "paid",
                paymentMethod: "GCash",
                paymentStatus: "paid",
                refundStatus: refundAmount > 0 ? "partial" : "none",
                refundAmount,
                actualPrice: finalPrice,
                xenditChargeId: chargeId,
                paidAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        console.log(`✅ GCash payment processed successfully for order ${orderId}`);
    }
    catch (err) {
        console.error("❌ GCash webhook handler error:", err.message, err.stack);
    }
};
exports.handleGcash = handleGcash;
//# sourceMappingURL=handleGcash.js.map