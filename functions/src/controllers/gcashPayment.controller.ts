import { Request, Response } from "express";
import axios from "axios";
import * as functions from "firebase-functions";

// 🔐 Secure access to environment-configured secret key
const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";

interface GcashPaymentParams {
  amount: number;
  orderId: string;
  customerId: string;
  customerPhone: string;
}

export const createGcashPayment = async ({
  amount,
  orderId,
  customerId,
  customerPhone,
}: GcashPaymentParams) => {
  const referenceId = `order-${orderId}-cust-${customerId}-${Date.now()}`;

  // ✅ Debug logging for deployed secrets (temporary)
  console.log("🔐 Xendit Secret (masked):", XENDIT_SECRET?.slice(0, 10) + "...");

  try {
    const response = await axios.post(
      XENDIT_API_URL,
      {
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
      },
      {
        auth: {
          username: XENDIT_SECRET,
          password: "",
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return {
      referenceId,
      checkoutUrl: response.data.actions?.checkout_url,
    };
  } catch (error: any) {
    // 🚨 Log exact API error response for debugging
    const errData = error.response?.data || error.message;
    console.error("❌ Xendit API Error:", errData);

    throw new Error(
      typeof errData === "string" ? errData : errData?.message || "GCash payment failed"
    );
  }
};

// ✅ Optional: Route-level handler for REST endpoint (testing / debugging)
export const payWithGcash = async (req: Request, res: Response) => {
  const { amount, orderId, customerId, customerPhone } = req.body;

  // 🔍 Validation
  if (!amount || isNaN(amount) || amount <= 0 || !orderId || !customerId || !customerPhone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const result = await createGcashPayment({
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
  } catch (error: any) {
    return res.status(500).json({
      error: "GCash payment failed",
      details: error.message,
    });
  }
};
