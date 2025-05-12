import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_CREDIT_TOKEN_URL = "https://api.xendit.co/v2/credit_card_tokens";

interface CreditCardLinkingParams {
  customerId: string; // your own customer ID, for external_id
  successRedirectUrl: string; // where Xendit should send the user after 3DS success
  failureRedirectUrl: string; // where Xendit should send the user after 3DS failure
  amount: number; // amount in cents (smallest currency unit)
  cardNumber: string; // e.g. "4000000000001091"
  cardExpMonth: string; // "01"–"12"
  cardExpYear: string; // "2025"
  cardCvn: string; // CVV / CVC
  cardHolderFirstName: string;
  cardHolderLastName: string;
  cardHolderEmail?: string; // optional, but recommended
  cardHolderPhoneNumber?: string; // optional, but recommended
  isMultipleUse?: boolean; // default = true
  shouldAuthenticate?: boolean; // default = true (trigger 3DS if needed)
}

export type CreditCardLinkResult = {
  tokenId: string;
  authenticationId?: string;
  status: "IN_REVIEW" | "VERIFIED" | "FAILED";
  redirectUrl?: string;
};

/**
 * Initiates a credit‐card tokenization + 3-DS flow in Xendit,
 * returning either a redirect URL for 3DS or a VERIFIED token immediately.
 */
export const createCreditCardLinkingSession = async ({
  customerId,
  successRedirectUrl,
  failureRedirectUrl,
  amount,
  cardNumber,
  cardExpMonth,
  cardExpYear,
  cardCvn,
  cardHolderFirstName,
  cardHolderLastName,
  cardHolderEmail,
  cardHolderPhoneNumber,
  isMultipleUse = true,
  shouldAuthenticate = true,
}: CreditCardLinkingParams): Promise<CreditCardLinkResult> => {
  const payload: Record<string, any> = {
    external_id: customerId,
    amount,
    card_number: cardNumber,
    card_exp_month: cardExpMonth,
    card_exp_year: cardExpYear,
    card_cvn: cardCvn,
    card_holder_first_name: cardHolderFirstName,
    card_holder_last_name: cardHolderLastName,
    is_multiple_use: isMultipleUse,
    should_authenticate: shouldAuthenticate,
    success_redirect_url: successRedirectUrl,
    failure_redirect_url: failureRedirectUrl,
  };

  if (cardHolderEmail) {
    payload.card_holder_email = cardHolderEmail;
  }
  if (cardHolderPhoneNumber) {
    payload.card_holder_phone_number = cardHolderPhoneNumber;
  }

  try {
    console.log("💳 Creating credit card token with payload:", payload);
    const response = await axios.post(XENDIT_CREDIT_TOKEN_URL, payload, {
      auth: { username: XENDIT_SECRET, password: "" },
      headers: { "Content-Type": "application/json" },
    });
    const data = response.data;

    if (!data.id) {
      throw new Error("No token ID returned from Xendit");
    }

    return {
      tokenId: data.id,
      authenticationId: data.authentication_id,
      status: data.status,
      redirectUrl: data.payer_authentication_url,
    };
  } catch (err: any) {
    console.error("❌ Credit‐card tokenization error:", err.response?.data || err.message);
    throw new Error(err.response?.data?.message || "Failed to tokenize credit card");
  }
};
