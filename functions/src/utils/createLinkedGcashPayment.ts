import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_CHARGE_URL = "https://api.xendit.co/ewallets/charges";

interface CreateLinkedGcashPaymentParams {
  amount: number;
  customerId: string;
  tokenId: string; // Xendit payment_method_id (linked GCash)
  referenceId: string;
}

interface CreateLinkedGcashPaymentResponse {
  referenceId: string;
  chargeId: string;
  checkoutUrl: string | null;
  isRedirectRequired: boolean;
  status: "SUCCEEDED" | "PENDING" | "FAILED";
}

export const createLinkedGcashPayment = async ({
  amount,
  customerId,
  tokenId,
  referenceId,
}: CreateLinkedGcashPaymentParams): Promise<CreateLinkedGcashPaymentResponse> => {
  const payload = {
    reference_id: referenceId,
    currency: "PHP",
    amount,
    payment_method_id: tokenId,
    checkout_method: "TOKENIZED_PAYMENT",
    channel_properties: {
      success_redirect_url: `myapp://payment/gcashPayment/success?ref=${referenceId}&uid=${customerId}`,
      failure_redirect_url: `myapp://payment/gcashPayment/failed`,
    },
  };

  try {
    console.log("💸 Charging linked GCash via Xendit:", payload);

    const response = await axios.post(XENDIT_CHARGE_URL, payload, {
      auth: {
        username: XENDIT_SECRET,
        password: "",
      },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });

    const data = response.data;

    console.log("✅ GCash charge response:", data);

    return {
      referenceId,
      chargeId: data.id,
      checkoutUrl: data.actions?.mobile_web_checkout_url ?? null,
      isRedirectRequired: data.is_redirect_required ?? false,
      status: data.status,
    };
  } catch (error: any) {
    console.error("❌ Failed to charge linked GCash account:", {
      message: error?.message,
      status: error?.response?.status,
      data: error?.response?.data,
    });

    throw new Error(error?.response?.data?.message || "GCash charge failed");
  }
};
