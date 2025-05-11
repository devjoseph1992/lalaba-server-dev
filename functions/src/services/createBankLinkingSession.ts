import axios from "axios";
import * as functions from "firebase-functions";

const XENDIT_SECRET = functions.config().xendit.secret;
const XENDIT_LINKED_AUTH_URL = "https://api.xendit.co/linked_account_tokens/auth";

interface LinkingParams {
  customerId: string;
  successRedirectUrl: string;
  failureRedirectUrl: string;
  channelCode: SupportedBankChannelCode;
  mobileNumber: string;
  email: string;
  cardLastFour?: string;
  cardExpiry?: string;
}

export type SupportedBankChannelCode =
  | "BA_BPI"
  | "BPI_RECURRING"
  | "BA_UBP"
  | "UBP_EADA"
  | "BA_RCBC"
  | "BA_CHINABANK"
  | "BDO_EPAY";

export const createBankLinkingSession = async ({
  customerId,
  channelCode,
  successRedirectUrl,
  failureRedirectUrl,
  mobileNumber,
  email,
  cardLastFour,
  cardExpiry,
}: LinkingParams) => {
  const properties: Record<string, any> = {
    account_mobile_number: mobileNumber,
    account_email: email,
    success_redirect_url: successRedirectUrl,
    failure_redirect_url: failureRedirectUrl,
  };

  if (cardLastFour) {
    properties.card_last_four = cardLastFour;
  }

  if (cardExpiry) {
    properties.card_expiry = cardExpiry;
  }

  const payload = {
    customer_id: customerId,
    channel_code: channelCode,
    properties,
  };

  try {
    console.log("🏦 Sending bank linking request with payload:", payload);

    const response = await axios.post(XENDIT_LINKED_AUTH_URL, payload, {
      auth: {
        username: XENDIT_SECRET,
        password: "",
      },
      headers: { "Content-Type": "application/json" },
    });

    const data = response.data;

    if (!data.authorizer_url) {
      throw new Error("❌ Missing redirect URL from Xendit.");
    }

    return {
      tokenId: data.id,
      status: data.status,
      type: data.type,
      redirectUrl: data.authorizer_url,
    };
  } catch (error: any) {
    console.error("❌ Bank Linking Error:", {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
    });
    throw new Error(error?.response?.data?.message || "Failed to initiate bank linking.");
  }
};
