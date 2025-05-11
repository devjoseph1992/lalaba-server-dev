import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_CHARGE_URL = "https://api.xendit.co/ewallets/charges";

export const createLinkedGcashPayment = async ({
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
    reference_id: referenceId,
    currency: "PHP",
    amount,
    payment_method_id: tokenId,
    checkout_method: "TOKENIZED_PAYMENT",
    channel_properties: {
      success_redirect_url: `myapp://payment/gcashPayment/gcash_success?ref=${referenceId}&uid=${customerId}`,
      failure_redirect_url: `myapp://payment/gcashPayment/gcash_failed`,
    },
  };

  try {
    console.log("💸 Charging linked GCash via Xendit:", {
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

    console.log("✅ Xendit GCash charge response:", data);

    return {
      referenceId,
      checkoutUrl: data.actions?.mobile_web_checkout_url ?? null,
      isRedirectRequired: data.is_redirect_required || false,
      status: data.status,
    };
  } catch (error: any) {
    console.error("❌ Failed to charge linked GCash account:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw new Error(error?.response?.data?.message || "Failed to charge linked GCash account");
  }
};
