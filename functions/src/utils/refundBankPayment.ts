import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;

export const refundBankPayment = async ({
  chargeId,
  amount,
  reason = "Order cancelled",
}: {
  chargeId: string;
  amount: number;
  reason?: string;
}) => {
  try {
    const response = await axios.post(
      `https://api.xendit.co/credit_or_debit_card_charges/${chargeId}/refunds`,
      {
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

    console.log("✅ Bank refund processed:", response.data);

    return {
      success: true,
      data: response.data,
    };
  } catch (error: any) {
    console.error("❌ Bank refund failed:", {
      message: error?.message,
      response: error?.response?.data,
    });

    throw new Error(error?.response?.data?.message || "Failed to refund bank payment");
  }
};
