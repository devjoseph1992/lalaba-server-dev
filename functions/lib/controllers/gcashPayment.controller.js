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
exports.payWithGcash = exports.createGcashPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
// 🔐 Secure access to environment-configured secret key
const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";
const createGcashPayment = async ({ amount, orderId, customerId, customerPhone, }) => {
    const referenceId = `order-${orderId}-cust-${customerId}-${Date.now()}`;
    // ✅ Debug logging for deployed secrets (temporary)
    console.log("🔐 Xendit Secret (masked):", XENDIT_SECRET?.slice(0, 10) + "...");
    try {
        const response = await axios_1.default.post(XENDIT_API_URL, {
            reference_id: referenceId,
            currency: "PHP",
            amount,
            checkout_method: "ONE_TIME_PAYMENT",
            channel_code: "PH_GCASH",
            channel_properties: {
                success_redirect_url: "myapp://payment/gcash_success",
                failure_redirect_url: "myapp://payment/gcash_failed",
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
        return {
            referenceId,
            checkoutUrl: response.data.actions?.checkout_url,
        };
    }
    catch (error) {
        // 🚨 Log exact API error response for debugging
        const errData = error.response?.data || error.message;
        console.error("❌ Xendit API Error:", errData);
        throw new Error(typeof errData === "string" ? errData : errData?.message || "GCash payment failed");
    }
};
exports.createGcashPayment = createGcashPayment;
// ✅ Optional: Route-level handler for REST endpoint (testing / debugging)
const payWithGcash = async (req, res) => {
    const { amount, orderId, customerId, customerPhone } = req.body;
    // 🔍 Validation
    if (!amount || isNaN(amount) || amount <= 0 || !orderId || !customerId || !customerPhone) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    try {
        const result = await (0, exports.createGcashPayment)({
            amount,
            orderId,
            customerId,
            customerPhone,
        });
        if (!result.checkoutUrl) {
            return res.status(500).json({ error: "Checkout URL not returned from Xendit" });
        }
        return res.status(200).json({
            message: "GCash payment initiated",
            ...result,
        });
    }
    catch (error) {
        return res.status(500).json({
            error: "GCash payment failed",
            details: error.message,
        });
    }
};
exports.payWithGcash = payWithGcash;
//# sourceMappingURL=gcashPayment.controller.js.map