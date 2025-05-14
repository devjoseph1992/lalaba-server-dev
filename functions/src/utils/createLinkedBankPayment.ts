import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_CHARGE_URL = "https://api.xendit.co/credit_or_debit_card/charges";

export const createLinkedBankPayment = async ({
  amount,
  customerId,
  tokenId,
  referenceId,
}: {
  amount: number;
  customerId: string;
  tokenId: string;
  referenceId: string;
}) => {
  const payload = {
    amount,
    payment_method_id: tokenId,
    reference_id: referenceId,
    currency: "PHP",
    capture_method: "AUTO",
    metadata: {
      customer_id: customerId,
    },
    channel_properties: {
      success_redirect_url: `myapp://payment/bankPayment/success?ref=${referenceId}&uid=${customerId}`,
      failure_redirect_url: `myapp://payment/bankPayment/failed`,
    },
  };

  try {
    console.log("🏦 Charging linked Bank/Card via Xendit:", {
      customerId,
      tokenId,
      referenceId,
      amount,
    });

    const response = await axios.post(XENDIT_CHARGE_URL, payload, {
      auth: {
        username: XENDIT_SECRET,
        password: "",
      },
      headers: {
        "Content-Type": "application/json",
      },
    });

    const data = response.data;

    console.log("✅ Xendit Bank/Card charge response:", data);

    return {
      referenceId,
      checkoutUrl: data.actions?.desktop_web_checkout_url ?? null,
      isRedirectRequired: data.is_redirect_required || false,
      status: data.status,
    };
  } catch (error: any) {
    console.error("❌ Failed to charge linked Bank/Card account:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw new Error(error?.response?.data?.message || "Failed to charge linked Bank/Card account");
  }
};
