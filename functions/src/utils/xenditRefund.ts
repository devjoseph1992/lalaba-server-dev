// utils/xenditRefund.ts
import axios from "axios";
import * as functions from "firebase-functions";

// 🔗 Xendit refund endpoint
const REFUND_URL = "https://api.xendit.co/refunds";

// 🔐 Get your secret from Firebase functions config
const XENDIT_SECRET = functions.config().xendit.secret;

/**
 * Issue a partial refund using Xendit's API.
 *
 * @param paymentRequestId - The original Xendit charge or payment request ID
 * @param amount - Amount to refund (in PHP)
 * @param reason - Optional reason for the refund
 * @returns Response data from Xendit
 */
export const refundExcessPayment = async ({
  paymentRequestId,
  amount,
  reason = "Adjusted after actual kilo",
}: {
  paymentRequestId: string;
  amount: number;
  reason?: string;
}) => {
  try {
    const response = await axios.post(
      REFUND_URL,
      {
        payment_request_id: paymentRequestId,
        amount,
        reason,
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

    return response.data;
  } catch (err: any) {
    console.error("❌ Xendit Refund Error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || err.message || "Refund failed.");
  }
};
