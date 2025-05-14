import { Router } from "express";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import { saveGcashPaymentMethod, saveBankPaymentMethod } from "../controllers/paymentMethod.logic";

dotenv.config();
const router = Router();
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN ?? "";

router.post("/webhook", async (req, res) => {
  try {
    const webhookData = req.body;
    console.log("📌 Xendit Webhook Received:", JSON.stringify(webhookData, null, 2));

    const receivedToken = req.headers["x-callback-token"];
    if (!receivedToken || receivedToken !== XENDIT_CALLBACK_TOKEN) {
      console.error("❌ Invalid Xendit Callback Token");
      return res.status(401).json({ error: "Unauthorized webhook request" });
    }

    const event: string = webhookData.event;
    const data: any = webhookData.data ?? webhookData;

    // ✅ GCash linking
    if (event === "payment_method.activated" && data?.status === "ACTIVE") {
      const customerId = data.customer_id;
      const tokenId = data.id;

      const userQuery = await admin
        .firestore()
        .collection("users")
        .where("xenditCustomerId", "==", customerId)
        .limit(1)
        .get();

      if (userQuery.empty) {
        console.warn(`❌ No user found with Xendit customerId: ${customerId}`);
        return res.status(200).send("No matching user (GCash linking logged)");
      }

      const userId = userQuery.docs[0].id;

      const gcashDocs = await admin
        .firestore()
        .collection("payment_methods")
        .doc(userId)
        .collection("gcash")
        .get();

      let matchedMobile: string | undefined;
      gcashDocs.forEach((doc) => {
        const d = doc.data();
        if (!d.tokenId && d.mobile_number) {
          matchedMobile = d.mobile_number;
        }
      });

      await saveGcashPaymentMethod(userId, {
        tokenId,
        provider: "GCASH",
        channel_code: data.ewallet?.channel_code || "GCASH",
        status: data.status,
        linkedAt: new Date(),
        updatedAt: new Date(),
        mobile_number: matchedMobile,
      });

      console.log(`✅ GCash payment method saved for user ${userId}`);
      return res.status(200).send("GCash payment method saved");
    }

    // ✅ Bank linking
    if (event.startsWith("linked_account_token.")) {
      const tokenId = data.id;
      const channelCode = data.channel_code;
      const customerId = data.customer_id;

      const props: Record<string, any> =
        typeof data.properties === "object" && data.properties !== null ? data.properties : {};

      const status =
        event === "linked_account_token.successful"
          ? "SUCCESSFUL"
          : data.status?.toUpperCase?.() || "UNKNOWN";

      let userId: string | null = null;

      try {
        // Lookup by customerId
        if (customerId) {
          const userQuery = await admin
            .firestore()
            .collection("users")
            .where("xenditCustomerId", "==", customerId)
            .limit(1)
            .get();

          if (!userQuery.empty) {
            userId = userQuery.docs[0].id;
          }
        }

        // Fallback: lookup via collectionGroup
        if (!userId) {
          const fallbackQuery = await admin
            .firestore()
            .collectionGroup("bank")
            .where("tokenId", "==", tokenId)
            .limit(1)
            .get();

          if (!fallbackQuery.empty) {
            const refPath = fallbackQuery.docs[0].ref.path;
            const parts = refPath.split("/");
            userId = parts[1];
          }
        }
      } catch (err) {
        console.error("❌ Firestore lookup error:", err);
        return res.status(500).send("Error resolving userId for bank token.");
      }

      if (!userId) {
        console.warn("❌ Could not resolve userId for token:", tokenId);
        return res.status(200).send("No matching user (bank linking logged)");
      }

      const bankRef = admin
        .firestore()
        .collection("payment_methods")
        .doc(userId)
        .collection("bank")
        .doc(tokenId);

      let cardLastFour = props?.card_last_four ?? null;
      let cardExpiry = props?.card_expiry ?? null;

      try {
        const savedDoc = await bankRef.get();
        if (!cardLastFour || !cardExpiry) {
          const saved = savedDoc.exists ? savedDoc.data() : {};
          cardLastFour = cardLastFour ?? saved?.cardLastFour ?? "0000";
          cardExpiry = cardExpiry ?? saved?.cardExpiry ?? "00/00";
        }

        const updatePayload = {
          status,
          cardLastFour,
          cardExpiry,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (savedDoc.exists) {
          await bankRef.set(updatePayload, { merge: true });
          console.log(`🔁 Updated bank method ${tokenId} to status ${status}`);
        } else {
          await saveBankPaymentMethod(userId, {
            tokenId,
            channelCode,
            status,
            accountEmail: props?.account_email ?? "unknown@example.com",
            accountMobileNumber: props?.account_mobile_number ?? "0000000000",
            cardLastFour,
            cardExpiry,
            linkedAt: new Date(),
          });
          console.log(`🆕 Created new bank method ${tokenId}`);
        }

        return res.status(200).send("Bank payment method processed");
      } catch (err) {
        console.error("❌ Failed to save bank method:", err);
        return res.status(500).send("Failed to save bank payment method.");
      }
    }

    // ✅ Payment success (eWallet/charge)
    const validSuccessEvents = ["ewallet.charge.success", "charge.success", "ewallet.capture"];
    if (validSuccessEvents.includes(event) && data?.status === "SUCCEEDED") {
      const chargeId = data.id;
      const referenceId = data.reference_id;

      if (!referenceId || !referenceId.startsWith("preorder-")) {
        console.error("❌ Invalid reference_id:", referenceId);
        return res.status(400).json({ error: "Invalid reference_id format" });
      }

      const orderId = referenceId.split("-")[1];
      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        console.error("❌ Order not found:", orderId);
        return res.status(404).json({ error: "Order not found" });
      }

      await admin.firestore().runTransaction(async (tx) => {
        tx.update(orderRef, {
          paymentStatus: "paid",
          status: "pending",
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          xenditChargeId: chargeId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        tx.set(admin.firestore().collection("xendit_webhooks").doc(chargeId), {
          chargeId,
          referenceId,
          amount: data.charge_amount,
          currency: data.currency,
          channelCode: data.channel_code,
          status: data.status,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      console.log(`✅ Payment recorded for order ${orderId}`);
      return res.status(200).json({ message: "Payment recorded." });
    }

    console.log("ℹ️ Unhandled webhook event:", event);
    return res.status(200).send("Webhook received (no matching handler)");
  } catch (err) {
    console.error("❌ Webhook handler error:", err);
    return res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
