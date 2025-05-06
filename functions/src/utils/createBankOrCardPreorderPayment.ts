import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_INVOICE_URL = "https://api.xendit.co/v2/invoices";

/**
 * Create an invoice for bank transfer or credit card checkout.
 * Xendit will show all available channels (bank, card, e-wallet, etc.)
 */
export const createBankOrCardPreorderPayment = async ({
  amount,
  customerId,
  customerEmail,
  referenceId,
}: {
  amount: number;
  customerId: string;
  customerEmail: string;
  referenceId?: string;
}) => {
  const refId = referenceId ?? `topup-${customerId}-${Date.now()}`;

  const response = await axios.post(
    XENDIT_INVOICE_URL,
    {
      external_id: refId,
      payer_email: customerEmail,
      amount,
      currency: "PHP",
      description: "Lalaba Payment Checkout",
      success_redirect_url: `myapp://payment/success?ref=${refId}&uid=${customerId}`,
      failure_redirect_url: `myapp://payment/failed`,
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

  console.log("📦 Xendit Invoice response:", JSON.stringify(response.data, null, 2));

  if (!response.data.invoice_url) {
    throw new Error("Invoice checkout URL not found in response.");
  }

  return {
    referenceId: refId,
    checkoutUrl: response.data.invoice_url,
  };
};
