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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectHeldAmount = exports.releaseHold = exports.deductAndHold = exports.withdrawFromWallet = exports.topUpWallet = exports.getWalletBalance = exports.createWallet = void 0;
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const encryption_1 = require("../utils/encryption");
dotenv.config();
const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_PAYMENT_URL = process.env.XENDIT_PAYMENT_URL;
if (!XENDIT_SECRET_KEY) {
    throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
}
if (!XENDIT_PAYMENT_URL) {
    throw new Error("❌ XENDIT_PAYMENT_URL is missing in environment variables.");
}
// =====================================================
// WALLET CORE LOGIC
// =====================================================
const generateWalletAccountNumber = async () => {
    let isUnique = false;
    let accountNumber = "";
    while (!isUnique) {
        accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // 10-digit number
        const snapshot = await admin
            .firestore()
            .collection("wallets")
            .where("accountNumber", "==", accountNumber)
            .get();
        if (snapshot.empty) {
            isUnique = true;
        }
    }
    return accountNumber;
};
const createWallet = async (userId) => {
    try {
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists) {
            const lockUntil = new Date();
            lockUntil.setDate(lockUntil.getDate() + 15);
            const accountNumber = await generateWalletAccountNumber();
            await walletRef.set({
                userId,
                accountNumber,
                balance: (0, encryption_1.encrypt)("0"),
                holdAmount: (0, encryption_1.encrypt)("0"),
                holdUntil: null,
                nextWithdrawalDate: admin.firestore.Timestamp.fromDate(lockUntil),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
            console.log(`✅ Wallet created for user ${userId}`);
            return { userId, accountNumber, balance: 0 };
        }
        else {
            return walletSnapshot.data();
        }
    }
    catch (error) {
        console.error("❌ Error creating wallet:", error);
        throw error;
    }
};
exports.createWallet = createWallet;
const getWalletBalance = async (userId) => {
    try {
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists)
            throw new Error("❌ Wallet not found.");
        const walletData = walletSnapshot.data();
        return {
            accountNumber: walletData.accountNumber,
            balance: parseFloat((0, encryption_1.decrypt)(walletData.balance)),
            holdAmount: walletData?.holdAmount ? parseFloat((0, encryption_1.decrypt)(walletData.holdAmount)) : 0,
            holdUntil: walletData?.holdUntil?.toDate() || null,
            nextWithdrawalDate: walletData.nextWithdrawalDate.toDate(),
        };
    }
    catch (error) {
        console.error("❌ Error fetching wallet balance:", error);
        throw error;
    }
};
exports.getWalletBalance = getWalletBalance;
// =====================================================
// TOP-UP
// =====================================================
const topUpWallet = async (userId, amount, paymentMethod) => {
    try {
        if (amount <= 0)
            throw new Error("❌ Invalid top-up amount.");
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists)
            throw new Error("❌ Wallet not found.");
        const referenceId = `ewallet-${Date.now()}-${userId}`;
        const channelCodeMapping = {
            GCASH: "GCASH",
            BANK_TRANSFER: "BPI",
            CREDIT_CARD: "CREDIT_CARD",
        };
        const requestBody = {
            reference_id: referenceId,
            currency: "PHP",
            amount,
            checkout_method: "ONE_TIME_PAYMENT",
            channel_code: channelCodeMapping[paymentMethod],
            channel_properties: {
                success_redirect_url: "https://yourdomain.com/success",
                failure_redirect_url: "https://yourdomain.com/failure",
            },
        };
        const response = await axios_1.default.post(XENDIT_PAYMENT_URL, requestBody, {
            auth: { username: XENDIT_SECRET_KEY, password: "" },
        });
        return {
            message: "Top-up request initiated.",
            referenceId,
            checkoutUrl: response.data.checkout_url,
        };
    }
    catch (error) {
        console.error("❌ Error initiating top-up:", error);
        throw error;
    }
};
exports.topUpWallet = topUpWallet;
// =====================================================
// WITHDRAW
// =====================================================
const withdrawFromWallet = async (userId, amount) => {
    try {
        if (amount < 500)
            throw new Error("❌ Minimum withdrawal is ₱500.");
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists)
            throw new Error("❌ Wallet not found.");
        const walletData = walletSnapshot.data();
        const currentBalance = parseFloat((0, encryption_1.decrypt)(walletData.balance));
        const holdAmount = walletData?.holdAmount ? parseFloat((0, encryption_1.decrypt)(walletData.holdAmount)) : 0;
        const availableBalance = currentBalance - holdAmount;
        const nextWithdrawalDate = walletData?.nextWithdrawalDate?.toDate() || new Date();
        if (availableBalance < amount)
            throw new Error("❌ Insufficient available balance.");
        if (new Date() < nextWithdrawalDate) {
            throw new Error(`❌ Withdrawals are locked until ${nextWithdrawalDate.toLocaleDateString()}`);
        }
        const newBalance = currentBalance - amount;
        const lockUntil = new Date();
        lockUntil.setDate(lockUntil.getDate() + 15);
        await walletRef.update({
            balance: (0, encryption_1.encrypt)(newBalance.toString()),
            nextWithdrawalDate: admin.firestore.Timestamp.fromDate(lockUntil),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("wallet_transactions").add({
            userId,
            type: "withdrawal",
            amount,
            newBalance,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            message: "Withdrawal successful. Wallet locked for 15 days.",
            newBalance,
        };
    }
    catch (error) {
        console.error("❌ Error withdrawing from wallet:", error);
        throw error;
    }
};
exports.withdrawFromWallet = withdrawFromWallet;
// =====================================================
// PLATFORM FEE: HOLD / COLLECT / RELEASE
// =====================================================
/**
 * ✅ Deduct and Hold Platform Fee
 */
const deductAndHold = async (userId, feeAmount, role, holdMinutes = 30) => {
    try {
        if (feeAmount <= 0) {
            throw new Error("❌ Platform fee must be greater than zero.");
        }
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnap = await walletRef.get();
        if (!walletSnap.exists)
            throw new Error(`❌ Wallet not found for ${role}: ${userId}`);
        const walletData = walletSnap.data();
        const balance = parseFloat((0, encryption_1.decrypt)(walletData.balance));
        if (balance < feeAmount) {
            throw new Error(`❌ ${role} has insufficient balance to cover platform fee.`);
        }
        const newBalance = balance - feeAmount;
        const holdUntil = new Date(Date.now() + holdMinutes * 60 * 1000);
        await walletRef.update({
            balance: (0, encryption_1.encrypt)(newBalance.toString()),
            holdAmount: (0, encryption_1.encrypt)(feeAmount.toString()),
            holdUntil: admin.firestore.Timestamp.fromDate(holdUntil),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("wallet_transactions").add({
            userId,
            type: "platform_fee_hold",
            role,
            amount: feeAmount,
            newBalance,
            holdUntil,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            newBalance,
            heldAmount: feeAmount,
            holdUntil,
        };
    }
    catch (error) {
        console.error(`❌ Error holding platform fee for ${role}:`, error);
        throw error;
    }
};
exports.deductAndHold = deductAndHold;
/**
 * ✅ Release Platform Fee Hold
 */
const releaseHold = async (userId) => {
    try {
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnap = await walletRef.get();
        if (!walletSnap.exists)
            throw new Error(`❌ Wallet not found for user: ${userId}`);
        const walletData = walletSnap.data();
        const balance = parseFloat((0, encryption_1.decrypt)(walletData.balance));
        const holdAmount = walletData?.holdAmount ? parseFloat((0, encryption_1.decrypt)(walletData.holdAmount)) : 0;
        if (holdAmount <= 0) {
            return { newBalance: balance, releasedAmount: 0 };
        }
        const updatedBalance = balance + holdAmount;
        await walletRef.update({
            balance: (0, encryption_1.encrypt)(updatedBalance.toString()),
            holdAmount: (0, encryption_1.encrypt)("0"),
            holdUntil: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("wallet_transactions").add({
            userId,
            type: "platform_fee_refund",
            amount: holdAmount,
            newBalance: updatedBalance,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            newBalance: updatedBalance,
            releasedAmount: holdAmount,
        };
    }
    catch (error) {
        console.error("❌ Error releasing platform fee hold:", error);
        throw error;
    }
};
exports.releaseHold = releaseHold;
/**
 * ✅ Collect Held Platform Fee (Called when order is completed)
 */
const collectHeldAmount = async (userId, role) => {
    try {
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnap = await walletRef.get();
        if (!walletSnap.exists)
            throw new Error(`❌ Wallet not found for ${role}: ${userId}`);
        const walletData = walletSnap.data();
        const heldAmount = walletData?.holdAmount ? parseFloat((0, encryption_1.decrypt)(walletData.holdAmount)) : 0;
        if (heldAmount <= 0) {
            return { collectedAmount: 0 };
        }
        await walletRef.update({
            holdAmount: (0, encryption_1.encrypt)("0"),
            holdUntil: null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await admin.firestore().collection("wallet_transactions").add({
            userId,
            type: "platform_fee_collected",
            role,
            amount: heldAmount,
            collectedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return {
            collectedAmount: heldAmount,
        };
    }
    catch (error) {
        console.error(`❌ Error collecting platform fee for ${role}:`, error);
        throw error;
    }
};
exports.collectHeldAmount = collectHeldAmount;
//# sourceMappingURL=walletService.js.map