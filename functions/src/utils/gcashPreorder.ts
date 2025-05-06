import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_API_URL = "https://api.xendit.co/ewallets/charges";

/**
 * Create a GCash payment request via Xendit.
 * - If `referenceId` is provided (e.g. for customer orders), use it.
 * - If not provided (e.g. wallet top-up), auto-generate one.
 */
export const createGcashPreorderPayment = async ({
  amount,
  customerId,
  customerPhone,
  referenceId, // optional
}: {
  amount: number;
  customerId: string;
  customerPhone: string;
  referenceId?: string;
}) => {
  // ✅ Auto-generate for merchant/rider top-ups if not provided
  const refId = referenceId ?? `topup-${customerId}-${Date.now()}`;

  const response = await axios.post(
    XENDIT_API_URL,
    {
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
