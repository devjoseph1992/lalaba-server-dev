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
exports.handleXenditWebhook = exports.createXenditCustomer = void 0;
const axios_1 = __importDefault(require("axios"));
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const functions = __importStar(require("firebase-functions"));
// Load .env for local dev
dotenv.config();
function getXenditSecretKey() {
    return (process.env.XENDIT_SECRET_KEY || // ✅ Local dev via .env
        functions.config().xendit?.secret_key || // ✅ Firebase functions config
        (() => {
            throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
        })());
}
/**
 * ✅ Create a Customer in Xendit
 */
const createXenditCustomer = async (userId, email, firstName, lastName, phoneNumber) => {
    try {
        const referenceId = `customer-${userId}`;
        const requestBody = {
            type: "INDIVIDUAL",
            reference_id: referenceId,
            email,
            mobile_number: phoneNumber,
            individual_detail: {
                given_names: firstName,
                surname: lastName,
            },
        };
        console.log("📌 Sending request to Xendit:", requestBody);
        const response = await axios_1.default.post("https://api.xendit.co/customers", requestBody, {
            auth: { username: getXenditSecretKey(), password: "" },
        });
        console.log("✅ Xendit Customer Created:", response.data);
        await admin.firestore().collection("users").doc(userId).update({
            xenditCustomerId: response.data.id,
            xenditReferenceId: response.data.reference_id,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return response.data;
    }
    catch (error) {
        console.error("❌ Error creating Xendit customer:", error.response?.data || error.message);
        throw error;
    }
};
exports.createXenditCustomer = createXenditCustomer;
/**
 * ✅ Handle Xendit Webhook for Payment Updates
 */
const handleXenditWebhook = async (webhookData) => {
    try {
        console.log("📌 Xendit Webhook Received:", webhookData);
        if (webhookData.status !== "SUCCEEDED") {
            console.log("ℹ️ Payment is not completed. Ignoring.");
            return;
        }
        const referenceId = webhookData.reference_id;
        if (!referenceId || !referenceId.startsWith("customer-")) {
            console.error("❌ Invalid reference ID format:", referenceId);
            return;
        }
        const userId = referenceId.replace("customer-", "");
        const userRef = admin.firestore().collection("users").doc(userId);
        const userSnapshot = await userRef.get();
        if (!userSnapshot.exists) {
            console.error("❌ User record not found.");
            return;
        }
        const userData = userSnapshot.data();
        if (!userData) {
            console.error("❌ User data is missing.");
            return;
        }
        const newBalance = (userData?.walletBalance || 0) + webhookData.amount;
        await userRef.update({
            walletBalance: newBalance,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`✅ Wallet updated for user ${userId}: +${webhookData.amount}`);
    }
    catch (error) {
        console.error("❌ Error processing webhook:", error);
        throw error;
    }
};
exports.handleXenditWebhook = handleXenditWebhook;
//# sourceMappingURL=xenditService.js.map