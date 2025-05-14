import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;

// Allowed reasons based on Xendit documentation
type XenditRefundReason = "DUPLICATE" | "FRAUDULENT" | "REQUESTED_BY_CUSTOMER";

export async function refundGcashPayment({
  chargeId,
  amount,
  reason = "REQUESTED_BY_CUSTOMER", // ✅ fallback to safe value
}: {
  chargeId: string;
  amount: number;
  reason?: string;
}) {
  try {
    const validReasons: XenditRefundReason[] = ["DUPLICATE", "FRAUDULENT", "REQUESTED_BY_CUSTOMER"];
    const safeReason: XenditRefundReason = validReasons.includes(reason as XenditRefundReason)
      ? (reason as XenditRefundReason)
      : "REQUESTED_BY_CUSTOMER"; // ✅ Enforce valid value

    const response = await axios.post(
      `https://api.xendit.co/ewallets/charges/${chargeId}/refunds`,
      {
        amount,
        reason: safeReason,
      },
      {
        auth: { username: XENDIT_SECRET, password: "" },
        headers: { "Content-Type": "application/json" },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("❌ Xendit refund error:", error?.response?.data || error.message);
    throw error;
  }
}
