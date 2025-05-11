import { firestore } from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { createXenditCustomer } from "../services/xenditService";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

export const onCustomerUserDocCreated = firestore
  .document("users/{userId}")
  .onCreate(async (snap, context) => {
    const userId = context.params.userId;
    const data = snap.data() as {
      role?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
    };

    if (!data) {
      console.warn(`⚠️ No data found for UID: ${userId}`);
      return null;
    }

    if (data.role !== "customer") {
      console.log(`🟡 Skipping Xendit creation for UID: ${userId} (role: ${data.role})`);
      return null;
    }

    const { email = "", firstName = "", lastName = "", phone = "" } = data;

    if (!email || !firstName || !lastName || !phone) {
      console.warn(`⚠️ Incomplete data for UID: ${userId}`, {
        email,
        firstName,
        lastName,
        phone,
      });
      return null;
    }

    try {
      await createXenditCustomer(userId, email, firstName, lastName, phone);
      console.log(`✅ Xendit customer successfully created for UID: ${userId}`);
    } catch (error: any) {
      console.error(
        `❌ Failed to create Xendit customer for UID: ${userId}`,
        error.message || error
      );
    }

    return null;
  });
