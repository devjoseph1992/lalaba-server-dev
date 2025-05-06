// controllers/gcashPreorder.controller.ts
import { Request, Response } from "express";
import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";

// 🔁 Generate a pre-payment GCash URL before order is created
export const initiateGcashPreorderPayment = async (req: Request, res: Response) => {
  const { amount, customerId, customerPhone } = req.body;

  if (!amount || !customerId || !customerPhone) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const referenceId = `preorder-${customerId}-${Date.now()}`;

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
          success_redirect_url: `myapp://payment/gcash_success?ref=${referenceId}&uid=${customerId}`,
          failure_redirect_url: `myapp://payment/gcash_failed`,
          mobile_number: customerPhone,
        },
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

    return res.status(200).json({
      message: "GCash checkout initiated",
      referenceId,
      checkoutUrl: response.data.actions.desktop_web_checkout_url, // ✅ Use desktop_web_checkout_url
    });
  } catch (error: any) {
    console.error("❌ GCash API Error:", error.response?.data || error.message);
    return res.status(500).json({
      error: "Failed to initiate GCash payment",
      details: error.response?.data || error.message,
    });
  }
};
