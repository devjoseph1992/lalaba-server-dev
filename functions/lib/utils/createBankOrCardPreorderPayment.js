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
exports.createBankOrCardPreorderPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_INVOICE_URL = "https://api.xendit.co/v2/invoices";
/**
 * Create an invoice for bank transfer or credit card checkout.
 * Xendit will show all available channels (bank, card, e-wallet, etc.)
 */
const createBankOrCardPreorderPayment = async ({ amount, customerId, customerEmail, referenceId, }) => {
    const refId = referenceId ?? `topup-${customerId}-${Date.now()}`;
    const response = await axios_1.default.post(XENDIT_INVOICE_URL, {
        external_id: refId,
        payer_email: customerEmail,
        amount,
        currency: "PHP",
        description: "Lalaba Payment Checkout",
        success_redirect_url: `myapp://payment/success?ref=${refId}&uid=${customerId}`,
        failure_redirect_url: `myapp://payment/failed`,
    }, {
        auth: {
            username: XENDIT_SECRET,
            password: "",
        },
        headers: {
            "Content-Type": "application/json",
        },
    });
    console.log("📦 Xendit Invoice response:", JSON.stringify(response.data, null, 2));
    if (!response.data.invoice_url) {
        throw new Error("Invoice checkout URL not found in response.");
    }
    return {
        referenceId: refId,
        checkoutUrl: response.data.invoice_url,
    };
};
exports.createBankOrCardPreorderPayment = createBankOrCardPreorderPayment;
//# sourceMappingURL=createBankOrCardPreorderPayment.js.map