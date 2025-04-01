// functions/src/services/xenditService.ts

import axios from "axios";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY ?? "";
if (!XENDIT_SECRET_KEY) {
  throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
}

/**
 * ✅ Create a Customer in Xendit
 * @param {string} userId - Firebase user ID
 * @param {string} email - Customer's email
 * @param {string} firstName - Customer's first name
 * @param {string} lastName - Customer's last name
 * @param {string} phoneNumber - Customer's phone number
 * @returns {Promise<any>} - Returns Xendit customer object
 */
export const createXenditCustomer = async (
  userId: string,
  email: string,
  firstName: string,
  lastName: string,
  phoneNumber: string
) => {
  try {
    const referenceId = `customer-${userId}`;

    const requestBody = {
      type: "INDIVIDUAL", // ✅ Required field
      reference_id: referenceId,
      email,
      mobile_number: phoneNumber, // ✅ Keeping mobile_number
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
        auth: { username: XENDIT_SECRET_KEY, password: "" },
      }
    );

    console.log("✅ Xendit Customer Created:", response.data);

    // ✅ Store Xendit Customer ID in Firestore
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

    // ✅ Extract userId from reference_id
    const referenceId = webhookData.reference_id;
    if (!referenceId || !referenceId.startsWith("customer-")) {
      console.error("❌ Invalid reference ID format:", referenceId);
      return;
    }

    const userId = referenceId.replace("customer-", "");

    // ✅ Fetch User Data from Firestore
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

    // ✅ Update Wallet Balance in Firestore
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
