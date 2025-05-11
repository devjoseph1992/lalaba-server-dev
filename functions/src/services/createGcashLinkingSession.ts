import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/v2/payment_methods";

export const createGcashLinkingSession = async ({
  customerId,
  customerPhone, // optional
  successRedirectUrl,
  failureRedirectUrl,
}: {
  customerId: string;
  customerPhone?: string; // ✅ optional now
  successRedirectUrl: string;
  failureRedirectUrl: string;
}) => {
  const payload: any = {
    type: "EWALLET",
    reusability: "MULTIPLE_USE",
    customer_id: customerId,
    ewallet: {
      channel_code: "GCASH",
      channel_properties: {
        success_return_url: successRedirectUrl,
        failure_return_url: failureRedirectUrl,
      },
    },
  };

  // 🧠 Include mobile number only if provided
  if (customerPhone) {
    payload.ewallet.channel_properties.mobile_number = customerPhone;
  }

  try {
    console.log("🔗 Creating GCash linking session with payload:", payload);

    const response = await axios.post(XENDIT_API_URL, payload, {
      auth: {
        username: XENDIT_SECRET,
        password: "",
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const { id, status, type, actions } = response.data;

    if (!actions?.[0]?.url) {
      throw new Error("❌ Failed to get GCash linking redirect URL.");
    }

    return {
      tokenId: id,
      status,
      type,
      redirectUrl: actions[0].url, // ✅ corrected path
    };
  } catch (error: any) {
    console.error("❌ Xendit Error:", {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw new Error(error?.response?.data?.message || "Xendit API error");
  }
};
