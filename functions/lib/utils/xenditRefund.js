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
exports.refundExcessPayment = void 0;
// utils/xenditRefund.ts
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
// 🔗 Xendit refund endpoint
const REFUND_URL = "https://api.xendit.co/refunds";
// 🔐 Get your secret from Firebase functions config
const XENDIT_SECRET = functions.config().xendit.secret;
/**
 * Issue a partial refund using Xendit's API.
 *
 * @param paymentRequestId - The original Xendit charge or payment request ID
 * @param amount - Amount to refund (in PHP)
 * @param reason - Optional reason for the refund
 * @returns Response data from Xendit
 */
const refundExcessPayment = async ({ paymentRequestId, amount, reason = "Adjusted after actual kilo", }) => {
    try {
        const response = await axios_1.default.post(REFUND_URL, {
            payment_request_id: paymentRequestId,
            amount,
            reason,
        }, {
            auth: {
                username: XENDIT_SECRET,
                password: "",
            },
            headers: {
                "Content-Type": "application/json",
            },
        });
        return response.data;
    }
    catch (err) {
        console.error("❌ Xendit Refund Error:", err.response?.data || err.message);
        throw new Error(err.response?.data?.message || err.message || "Refund failed.");
    }
};
exports.refundExcessPayment = refundExcessPayment;
//# sourceMappingURL=xenditRefund.js.map