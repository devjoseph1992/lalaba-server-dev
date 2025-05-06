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
exports.createGcashPreorderPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";
/**
 * Create a GCash payment request via Xendit.
 * - If `referenceId` is provided (e.g. for customer orders), use it.
 * - If not provided (e.g. wallet top-up), auto-generate one.
 */
const createGcashPreorderPayment = async ({ amount, customerId, customerPhone, referenceId, // optional
 }) => {
    // ✅ Auto-generate for merchant/rider top-ups if not provided
    const refId = referenceId ?? `topup-${customerId}-${Date.now()}`;
    const response = await axios_1.default.post(XENDIT_API_URL, {
        reference_id: refId,
        currency: "PHP",
        amount,
        checkout_method: "ONE_TIME_PAYMENT",
        channel_code: "PH_GCASH",
        channel_properties: {
            success_redirect_url: `myapp://payment/gcash_success?ref=${refId}&uid=${customerId}`,
            failure_redirect_url: `myapp://payment/gcash_failed`,
        },
        mobile_number: customerPhone,
    }, {
        auth: {
            username: XENDIT_SECRET,
            password: "",
        },
        headers: {
            "Content-Type": "application/json",
        },
    });
    console.log("📦 Xendit response:", JSON.stringify(response.data, null, 2));
    const checkoutUrl = response.data.actions?.mobile_web_checkout_url;
    if (!checkoutUrl) {
        throw new Error("GCash checkout URL not found in response.");
    }
    return {
        referenceId: refId,
        checkoutUrl,
    };
};
exports.createGcashPreorderPayment = createGcashPreorderPayment;
//# sourceMappingURL=gcashPreorder.js.map