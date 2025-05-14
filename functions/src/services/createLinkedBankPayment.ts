// functions/src/services/createLinkedBankPayment.ts
import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const LINKED_BANK_CHARGE = "https://api.xendit.co/linked_account_charges";

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
    external_id: referenceId,
    amount,
    payment_method_id: tokenId,
    on_demand: true,
  };

  try {
    console.log("💸 Charging linked Bank via Xendit:", payload);

    const { data } = await axios.post(LINKED_BANK_CHARGE, payload, {
      auth: {
        username: XENDIT_SECRET,
        password: "",
      },
      headers: { "Content-Type": "application/json" },
    });

    console.log("✅ Xendit Bank charge response:", data);

    return {
      referenceId,
      checkoutUrl: data.actions?.[0]?.url ?? null,
      isRedirectRequired: data.is_redirect_required || false,
      status: data.status,
    };
  } catch (error: any) {
    console.error("❌ Failed to charge linked Bank account:", error.response?.data || error);
    throw new Error(error.response?.data?.message || "Failed to charge linked Bank account");
  }
};
