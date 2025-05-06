// routes/xenditInvoiceWebhook.ts
import { Router } from "express";
import * as admin from "firebase-admin";
import * as dotenv from "dotenv";

dotenv.config();

const router = Router();
const XENDIT_CALLBACK_TOKEN = process.env.XENDIT_CALLBACK_TOKEN ?? "";

/**
 * ✅ Webhook for Bank and Card Invoice Payments (Credit Card / Bank Transfer)
 */
router.post("/webhook/invoice", async (req, res) => {
  try {
    const data = req.body;
    console.log("📌 Invoice Webhook Received:", JSON.stringify(data, null, 2));

    // 🔐 Validate token
    const token = req.headers["x-callback-token"];
    if (!token || token !== XENDIT_CALLBACK_TOKEN) {
      console.error("❌ Invalid Xendit Callback Token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const {
      id: invoiceId,
      external_id: referenceId,
      status,
      paid_at,
      paid_amount,
      amount,
      currency,
      payment_method,
      payment_channel,
    } = data;

    // ✅ Only process successful payments
    const validStatuses = ["PAID", "SETTLED"];
    if (!invoiceId || !referenceId || !validStatuses.includes(status)) {
      console.warn("ℹ️ Ignoring invoice: not paid or missing fields.");
      return res.status(200).send("Ignored");
    }

    // ✅ Reference must match expected format: preorder-{orderId}-{userId}
    const parts = referenceId.split("-");
    if (parts.length < 3 || !referenceId.startsWith("preorder-")) {
      console.error("❌ Invalid reference_id format:", referenceId);
      return res.status(400).json({ error: "Invalid reference_id format" });
    }

    const orderId = parts[1];

    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("❌ Order not found:", orderId);
      return res.status(404).json({ error: "Order not found." });
    }

    const orderData = orderSnap.data();
    if (!orderData) {
      console.error("❌ Order data is missing.");
      return res.status(500).json({ error: "Order data missing" });
    }

    // ✅ Update Firestore transactionally
    await admin.firestore().runTransaction(async (tx) => {
      tx.update(orderRef, {
        paymentStatus: "paid",
        status: "pending",
        paidAt: paid_at
          ? admin.firestore.Timestamp.fromDate(new Date(paid_at))
          : admin.firestore.FieldValue.serverTimestamp(),
        xenditInvoiceId: invoiceId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      tx.set(admin.firestore().collection("xendit_webhooks").doc(invoiceId), {
        invoiceId,
        referenceId,
        amount,
        paidAmount: paid_amount ?? amount,
        currency: currency ?? "PHP",
        paymentMethod: payment_method || payment_channel || "UNKNOWN",
        status,
        type: "invoice",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Invoice PAID recorded for order ${orderId}`);
    return res.status(200).json({ message: "Invoice payment recorded." });
  } catch (err) {
    console.error("❌ Invoice Webhook Error:", err);
    return res.status(500).json({ error: "Webhook processing failed." });
  }
});

export default router;
