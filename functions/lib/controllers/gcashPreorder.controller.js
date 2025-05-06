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
exports.initiateGcashPreorderPayment = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";
// 🔁 Generate a pre-payment GCash URL before order is created
const initiateGcashPreorderPayment = async (req, res) => {
    const { amount, customerId, customerPhone } = req.body;
    if (!amount || !customerId || !customerPhone) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    const referenceId = `preorder-${customerId}-${Date.now()}`;
    try {
        const response = await axios_1.default.post(XENDIT_API_URL, {
            reference_id: referenceId,
            currency: "PHP",
            amount,
            checkout_method: "ONE_TIME_PAYMENT",
            channel_code: "PH_GCASH",
            channel_properties: {
                success_redirect_url: `myapp://payment/gcash_success?ref=${referenceId}&uid=${customerId}`,
                failure_redirect_url: `myapp://payment/gcash_failed`,
                mobile_number: customerPhone,
            },
        }, {
            auth: {
                username: XENDIT_SECRET,
                password: "",
            },
            headers: {
                "Content-Type": "application/json",
            },
        });
        return res.status(200).json({
            message: "GCash checkout initiated",
            referenceId,
            checkoutUrl: response.data.actions.desktop_web_checkout_url, // ✅ Use desktop_web_checkout_url
        });
    }
    catch (error) {
        console.error("❌ GCash API Error:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Failed to initiate GCash payment",
            details: error.response?.data || error.message,
        });
    }
};
exports.initiateGcashPreorderPayment = initiateGcashPreorderPayment;
//# sourceMappingURL=gcashPreorder.controller.js.map