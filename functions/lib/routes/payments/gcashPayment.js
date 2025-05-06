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
exports.payWithGcash = void 0;
const axios_1 = __importDefault(require("axios"));
const functions = __importStar(require("firebase-functions"));
const payWithGcash = async (req, res) => {
    const { amount, orderId, customerId, customerPhone } = req.body;
    if (!amount || isNaN(amount) || amount <= 0 || !orderId || !customerId) {
        return res
            .status(400)
            .json({ error: "Missing or invalid fields: amount, orderId, customerId" });
    }
    const referenceId = `order-${orderId}-cust-${customerId}-${Date.now()}`;
    try {
        const response = await axios_1.default.post("https://api.xendit.co/ewallets/charges", {
            reference_id: referenceId,
            currency: "PHP",
            amount: Number(amount),
            checkout_method: "ONE_TIME_PAYMENT",
            channel_code: "GCASH",
            channel_properties: {
                success_redirect_url: "myapp://payment/gcash_success",
                failure_redirect_url: "myapp://payment/gcash_failed",
            },
            ...(customerPhone ? { mobile_number: customerPhone } : {}),
        }, {
            auth: {
                username: functions.config().xendit.secret,
                password: "",
            },
            headers: {
                "Content-Type": "application/json",
            },
        });
        const checkoutUrl = response.data.actions?.checkout_url;
        if (!checkoutUrl) {
            return res.status(500).json({ error: "Checkout URL not returned from Xendit" });
        }
        return res.status(200).json({
            message: "GCash payment initiated",
            orderId,
            checkoutUrl,
            referenceId: response.data.reference_id,
        });
    }
    catch (error) {
        console.error("GCash Payment Error:", error.response?.data || error.message);
        return res.status(500).json({
            error: "Failed to create GCash payment",
            details: error.response?.data || error.message,
        });
    }
};
exports.payWithGcash = payWithGcash;
//# sourceMappingURL=gcashPayment.js.map