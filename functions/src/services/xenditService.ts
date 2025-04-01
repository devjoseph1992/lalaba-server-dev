import axios from "axios";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as functions from "firebase-functions";

// Load .env for local dev
dotenv.config();

function getXenditSecretKey(): string {
  return (
      process.env.XENDIT_SECRET_KEY || // ✅ Local dev via .env
      functions.config().xendit?.secret_key || // ✅ Firebase functions config
      (() => {
        throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
      })()
  );
}

/**
 * ✅ Create a Customer in Xendit
 */
export const createXenditCustomer = async (
    userId: string,
    email: string,
    firstName: string,
    lastName: string,
    phoneNumber: string
): Promise<any> => {
  try {
    const referenceId = `customer-${userId}`;

    const requestBody = {
      type: "INDIVIDUAL",
      reference_id: referenceId,
      email,
      mobile_number: phoneNumber,
      individual_detail: {
        given_names: firstName,
        surname: lastName,
      },
    };

    console.log("📌 Sending request to Xendit:", requestBody);

    const response = await axios.post(
        "https://api.xendit.co/customers",
        requestBody,
        {
          auth: { username: getXenditSecretKey(), password: "" },
        }
    );

    console.log("✅ Xendit Customer Created:", response.data);

    await admin.firestore().collection("users").doc(userId).update({
      xenditCustomerId: response.data.id,
      xenditReferenceId: response.data.reference_id,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return response.data;
  } catch (error: any) {
    console.error(
        "❌ Error creating Xendit customer:",
        error.response?.data || error.message
    );
    throw error;
  }
};

/**
 * ✅ Handle Xendit Webhook for Payment Updates
 */
export const handleXenditWebhook = async (webhookData: any) => {
  try {
    console.log("📌 Xendit Webhook Received:", webhookData);

    if (webhookData.status !== "SUCCEEDED") {
      console.log("ℹ️ Payment is not completed. Ignoring.");
      return;
    }

    const referenceId = webhookData.reference_id;
    if (!referenceId || !referenceId.startsWith("customer-")) {
      console.error("❌ Invalid reference ID format:", referenceId);
      return;
    }

    const userId = referenceId.replace("customer-", "");

    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      console.error("❌ User record not found.");
      return;
    }

    const userData = userSnapshot.data();
    if (!userData) {
      console.error("❌ User data is missing.");
      return;
    }

    const newBalance = (userData?.walletBalance || 0) + webhookData.amount;

    await userRef.update({
      walletBalance: newBalance,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Wallet updated for user ${userId}: +${webhookData.amount}`);
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    throw error;
  }
};
