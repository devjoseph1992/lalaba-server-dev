import { Response } from "express";
import * as admin from "firebase-admin";

interface PaymentSuccessData {
  id: string;
  reference_id: string;
  charge_amount?: number;
  currency?: string;
  channel_code?: string;
  status?: string;
}

export async function handlePaymentSuccess(
  event: string,
  data: Partial<PaymentSuccessData>,
  res: Response
): Promise<void> {
  try {
    const chargeId = data.id;
    const referenceId = data.reference_id;

    // ✅ Allow test payloads for Xendit dashboard manual tests
    const isTestPayload = referenceId === "test-payload";

    if (!chargeId || !referenceId || (!referenceId.startsWith("preorder-") && !isTestPayload)) {
      console.error("❌ Invalid or missing chargeId/referenceId:", {
        chargeId,
        referenceId,
      });
      res.status(400).json({ error: "Invalid or missing chargeId/referenceId" });
      return;
    }

    if (isTestPayload) {
      console.log("🧪 Received test payload from Xendit dashboard.");
      res.status(200).send("Test webhook received successfully.");
      return;
    }

    const orderId = referenceId.split("-")[1];
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      console.error("❌ Order not found:", orderId);
      res.status(404).json({ error: "Order not found" });
      return;
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
        amount: data.charge_amount ?? null,
        currency: data.currency ?? "PHP",
        channelCode: data.channel_code ?? "UNKNOWN",
        status: data.status ?? "SUCCEEDED",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Payment recorded for order ${orderId}`);
    res.status(200).json({ message: "Payment recorded." });
  } catch (error) {
    console.error("❌ handlePaymentSuccess error:", error);
    res.status(500).json({ error: "Failed to process payment success event" });
  }
}
