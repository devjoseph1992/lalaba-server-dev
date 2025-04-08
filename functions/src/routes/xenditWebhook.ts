// function/src/routes/xenditWebhook.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { sendPushNotification, sendEmailNotification } from "../services/notificationService";
import * as dotenv from "dotenv";
import { encrypt, decrypt } from "../utils/encryption"; // Import encryption utilities

dotenv.config(); // ✅ Load .env variables

const router = Router();

// ✅ Load Xendit Callback Token from .env
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN ?? "";

/**
 * ✅ Webhook Listener for Xendit Payments
 */
router.post("/webhook", async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("📌 Xendit Webhook Event Received:", webhookData);

    // ✅ Secure Webhook Verification
    const receivedToken = req.headers["x-callback-token"];
    if (!receivedToken || receivedToken !== XENDIT_CALLBACK_TOKEN) {
      console.error("❌ Invalid Xendit Callback Token");
      return res.status(401).json({ error: "Unauthorized webhook request" });
    }

    // ✅ Validate webhook structure
    if (!webhookData?.data?.status || !webhookData?.data?.id) {
      console.error("❌ Invalid webhook structure.");
      return res.status(400).json({ error: "Invalid webhook payload." });
    }

    // ✅ Only process successful payments
    if (webhookData.data.status !== "SUCCEEDED") {
      console.log("ℹ️ Payment is not completed. Ignoring.");
      return res.status(200).send("Ignored");
    }

    const chargeId = webhookData.data.id;
    const referenceId = webhookData.data.reference_id; // Expected format: `ewallet-ORDERID-USERID`
    const amount = webhookData.data.charge_amount;

    // ✅ Extract userId and orderId from reference_id
    const referenceParts = referenceId?.split("-");
    if (!referenceParts || referenceParts.length < 3) {
      console.error("❌ Invalid reference ID format:", referenceId);
      return res.status(400).json({ error: "Invalid reference ID format." });
    }

    const orderId = referenceParts[1];
    const userId = referenceParts[2];

    // ✅ Fetch User Document
    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (!userSnapshot.exists) {
      console.error("❌ User not found in Firestore:", userId);
      return res.status(404).json({ error: "User not found." });
    }

    const userData = userSnapshot.data();
    if (!userData) {
      console.error("❌ User data is missing.");
      return res.status(500).json({ error: "User data is missing." });
    }

    // ✅ Fetch Wallet Document
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      console.error("❌ Wallet not found for user:", userId);
      return res.status(404).json({ error: "Wallet not found." });
    }

    const walletData = walletSnapshot.data();
    const currentBalance = walletData?.balance ? parseFloat(decrypt(walletData.balance)) : 0;

    // ✅ Deduct 20% Platform Fee
    const platformFee = amount * 0.2;
    const netAmount = amount - platformFee;
    const newBalance = currentBalance + netAmount;

    // ✅ Store Webhook Data in Firestore (for logging/debugging)
    const webhookRef = admin.firestore().collection("xendit_webhooks").doc(chargeId);
    await webhookRef.set({
      chargeId,
      userId,
      orderId,
      referenceId,
      status: webhookData.data.status,
      amount,
      platformFee,
      netAmount,
      currency: webhookData.data.currency,
      channelCode: webhookData.data.channel_code,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ Firestore Transaction to Update Wallet Balance
    await admin.firestore().runTransaction(async (transaction) => {
      transaction.update(walletRef, {
        balance: encrypt(newBalance.toString()),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(webhookRef, {
        status: "completed",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      transaction.update(admin.firestore().collection("orders").doc(orderId), {
        status: "paid",
        paymentMethod: webhookData.data.channel_code,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Wallet updated for user ${userId}: +₱${netAmount} (after 20% fee)`);

    // ✅ Send Real-Time Notifications
    if (userData.fcmToken) {
      await sendPushNotification(
        userData.fcmToken,
        "Payment Successful",
        `Your payment of ₱${amount} has been received. Your new balance is ₱${newBalance}.`
      );
    }

    await sendEmailNotification(
      userData.email,
      "Payment Successful",
      `Hello ${userData.firstName},<br><br>Your payment of ₱${amount} has been received. Your new balance is ₱${newBalance}.<br><br>Thank you!`
    );

    return res.status(200).json({ message: "Payment processed successfully." });
  } catch (error) {
    console.error("❌ Error processing webhook:", error);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
});

export default router;
