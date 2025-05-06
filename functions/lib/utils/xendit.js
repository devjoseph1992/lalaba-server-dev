"use strict";
// functions/src/utils/xendit.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processRefund = exports.processXenditWebhook = exports.createPayment = void 0;
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("./encryption");
dotenv.config();
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_PAYMENT_URL = process.env.XENDIT_PAYMENT_URL;
const XENDIT_REFUND_URL = process.env.XENDIT_REFUND_URL;
if (!XENDIT_SECRET_KEY) {
    throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
}
if (!XENDIT_PAYMENT_URL) {
    throw new Error("❌ XENDIT_PAYMENT_URL is missing in environment variables.");
}
if (!XENDIT_REFUND_URL) {
    throw new Error("❌ XENDIT_REFUND_URL is missing in environment variables.");
}
/**
 * ✅ Create a Payment Request via Xendit
 */
const createPayment = async (userId, amount, paymentMethod) => {
    try {
        if (amount <= 0)
            throw new Error("❌ Invalid payment amount.");
        const referenceId = `payment-${userId}-${Date.now()}`;
        const channelCodeMapping = {
            GCASH: "GCASH",
            BANK_TRANSFER: "BPI",
            CREDIT_CARD: "CREDIT_CARD",
        };
        const response = await axios_1.default.post(XENDIT_PAYMENT_URL, {
            reference_id: referenceId,
            currency: "PHP",
            amount,
            checkout_method: "ONE_TIME_PAYMENT",
            channel_code: channelCodeMapping[paymentMethod],
            channel_properties: {
                success_redirect_url: "https://yourdomain.com/success",
            },
        }, {
            auth: { username: XENDIT_SECRET_KEY, password: "" },
        });
        console.log("✅ Xendit Payment Request Successful:", response.data);
        return {
            message: "Payment request initiated. Await confirmation.",
            referenceId,
            checkoutUrl: response.data.checkout_url,
        };
    }
    catch (error) {
        console.error("❌ Error initiating payment:", error);
        throw error;
    }
};
exports.createPayment = createPayment;
/**
 * ✅ Process Xendit Webhook - Update Wallet Balance
 */
const processXenditWebhook = async (webhookData) => {
    try {
        if (!webhookData?.data?.status || !webhookData?.data?.id) {
            throw new Error("❌ Invalid webhook structure.");
        }
        const chargeId = webhookData.data.id;
        const referenceId = webhookData.data.reference_id;
        const amount = webhookData.data.charge_amount;
        if (webhookData.data.status !== "SUCCEEDED") {
            console.log("ℹ️ Payment not completed. Ignoring webhook.");
            return;
        }
        // ✅ Extract user ID from reference ID
        const userId = referenceId?.split("-")[1];
        if (!userId)
            throw new Error("❌ Invalid reference ID format.");
        // ✅ Check if Webhook is Already Processed
        const webhookRef = admin.firestore().collection("xendit_webhooks").doc(chargeId);
        const webhookSnapshot = await webhookRef.get();
        if (webhookSnapshot.exists) {
            console.log("ℹ️ Webhook already processed. Ignoring duplicate.");
            return;
        }
        // ✅ Fetch User Wallet
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists) {
            throw new Error("❌ Wallet not found.");
        }
        const walletData = walletSnapshot.data();
        const currentBalance = parseFloat((0, encryption_1.decrypt)(walletData.balance));
        // ✅ Deduct 20% Platform Fee
        const platformFee = amount * 0.2;
        const finalAmount = amount - platformFee;
        const newBalance = currentBalance + finalAmount;
        // ✅ Store Webhook Data in Firestore
        await webhookRef.set({
            chargeId,
            userId,
            referenceId,
            status: webhookData.data.status,
            amount,
            platformFee,
            finalAmount,
            currency: webhookData.data.currency,
            channelCode: webhookData.data.channel_code,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        // ✅ Firestore Transaction to Update Wallet Balance
        await admin.firestore().runTransaction(async (transaction) => {
            transaction.update(walletRef, {
                balance: (0, encryption_1.encrypt)(newBalance.toString()),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            transaction.update(webhookRef, {
                status: "completed",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        console.log(`✅ Wallet updated for user ${userId}: +₱${finalAmount} (after 20% fee)`);
    }
    catch (error) {
        console.error("❌ Error processing Xendit webhook:", error);
        throw error;
    }
};
exports.processXenditWebhook = processXenditWebhook;
/**
 * ✅ Process Refund (Customer via Xendit, Merchant & Rider via Wallet)
 */
const processRefund = async (orderId) => {
    try {
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnapshot = await orderRef.get();
        if (!orderSnapshot.exists) {
            throw new Error("❌ Order not found.");
        }
        const orderData = orderSnapshot.data();
        if (!orderData) {
            throw new Error("❌ Order data is missing.");
        }
        // ✅ Check if order is within the 5-minute refund window
        const createdAt = orderData.createdAt.toDate();
        const refundWindow = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5-minute window
        if (new Date() > refundWindow) {
            throw new Error("❌ Refund window expired. Refund not possible.");
        }
        const paymentMethod = orderData.paymentMethod;
        const refundAmount = orderData.amountPaid || 0;
        const platformFee = orderData.platformFee || 0;
        const customerId = orderData.userId;
        const merchantId = orderData.merchantId;
        const riderId = orderData.riderId || null;
        const paymentRequestId = orderData.paymentRequestId; // Xendit payment ID
        if (!customerId || !merchantId || !riderId) {
            throw new Error("❌ Required IDs missing from order.");
        }
        // ✅ Fetch Merchant & Rider Wallets
        const merchantWalletRef = admin.firestore().collection("wallets").doc(merchantId);
        const riderWalletRef = admin.firestore().collection("wallets").doc(riderId);
        const merchantWalletSnapshot = await merchantWalletRef.get();
        const riderWalletSnapshot = await riderWalletRef.get();
        if (!merchantWalletSnapshot.exists || !riderWalletSnapshot.exists) {
            throw new Error("❌ Merchant or rider wallet not found.");
        }
        const merchantWalletData = merchantWalletSnapshot.data();
        const riderWalletData = riderWalletSnapshot.data();
        const currentMerchantBalance = parseFloat((0, encryption_1.decrypt)(merchantWalletData.balance));
        const currentRiderBalance = parseFloat((0, encryption_1.decrypt)(riderWalletData.balance));
        const merchantHoldAmount = parseFloat((0, encryption_1.decrypt)(merchantWalletData.holdAmount || "0"));
        const riderHoldAmount = parseFloat((0, encryption_1.decrypt)(riderWalletData.holdAmount || "0"));
        // ✅ Refund for Online Payments (GCash, Bank Transfer, Credit Card)
        if (["GCASH", "BANK_TRANSFER", "CREDIT_CARD"].includes(paymentMethod)) {
            if (refundAmount <= 0) {
                throw new Error("❌ No refundable amount found for this order.");
            }
            // ✅ Call Xendit Refund API
            const refundResponse = await axios_1.default.post(XENDIT_REFUND_URL, {
                amount: refundAmount,
                payment_request_id: paymentRequestId,
                reason: "Customer canceled order within 5-minute refund window.",
            }, {
                auth: { username: XENDIT_SECRET_KEY, password: "" },
            });
            console.log("✅ Xendit Refund Initiated:", refundResponse.data);
            // ✅ Firestore Transaction for Online Payment Refund
            await admin.firestore().runTransaction(async (transaction) => {
                transaction.update(orderRef, {
                    status: "refunded",
                    refundAmount,
                    refundStatus: "processed",
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                transaction.update(merchantWalletRef, {
                    balance: (0, encryption_1.encrypt)((currentMerchantBalance + merchantHoldAmount).toString()),
                    holdAmount: (0, encryption_1.encrypt)("0"),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                transaction.update(riderWalletRef, {
                    balance: (0, encryption_1.encrypt)((currentRiderBalance + riderHoldAmount).toString()),
                    holdAmount: (0, encryption_1.encrypt)("0"),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            });
            return {
                message: `Refund of ₱${refundAmount} successfully processed for customer via Xendit, and platform fee refunded to merchant & rider.`,
                refundAmount,
            };
        }
        // ✅ Refund for Cash Payments (Only Platform Fee to Merchant/Rider)
        if (paymentMethod === "cash") {
            // ✅ Refund Platform Fee to Merchant & Rider
            const refundedMerchantBalance = currentMerchantBalance + merchantHoldAmount;
            const refundedRiderBalance = currentRiderBalance + riderHoldAmount;
            await merchantWalletRef.update({
                balance: (0, encryption_1.encrypt)(refundedMerchantBalance.toString()),
                holdAmount: (0, encryption_1.encrypt)("0"),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            await riderWalletRef.update({
                balance: (0, encryption_1.encrypt)(refundedRiderBalance.toString()),
                holdAmount: (0, encryption_1.encrypt)("0"),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            // ✅ Update Order Status
            await orderRef.update({
                status: "cancelled",
                refundStatus: "platform_fee_refunded",
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Order ${orderId} cancelled. Platform fee refunded to Merchant ${merchantId} & Rider ${riderId}.`);
            return {
                message: "Order cancelled. Platform fee refunded to merchant & rider.",
                refundAmount: platformFee,
            };
        }
        throw new Error("❌ Invalid payment method for refund processing.");
    }
    catch (error) {
        console.error("❌ Error processing refund:", error);
        throw error;
    }
};
exports.processRefund = processRefund;
//# sourceMappingURL=xendit.js.map