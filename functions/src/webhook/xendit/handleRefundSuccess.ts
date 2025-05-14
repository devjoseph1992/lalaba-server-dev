import * as admin from "firebase-admin";
import { Response } from "express";

export async function handleRefundSuccess(event: string, data: any, res: Response) {
  try {
    const refundId: string | undefined = data.id;
    const chargeId: string | undefined = data.ewallet_charge_id || data.charge_id;
    const amount: number | undefined = data.refund_amount || data.amount;
    const currency: string = data.currency || "PHP";
    const status: string = data.status || "UNKNOWN";
    const type: "gcash" | "bank" = event.includes("ewallet") ? "gcash" : "bank";
    const timestamp = admin.firestore.FieldValue.serverTimestamp();

    // ✅ Validate fields
    if (!refundId || !chargeId) {
      console.warn("❌ Missing refundId or chargeId", { refundId, chargeId });
      return res.status(400).json({ error: "Missing chargeId or refundId." });
    }

    if (typeof amount !== "number" || isNaN(amount)) {
      console.warn("❌ Invalid refund amount", { amount });
      return res.status(400).json({ error: "Invalid refund amount." });
    }

    console.log(`💸 ${type.toUpperCase()} Refund received: ${refundId} for charge ${chargeId}`);

    // 🔍 Fetch the related order
    const orderQuery = await admin
      .firestore()
      .collection("orders")
      .where("xenditChargeId", "==", chargeId)
      .limit(1)
      .get();

    if (orderQuery.empty) {
      console.warn("❌ No order found for chargeId:", chargeId);
      return res.status(200).send("Refund webhook received (no matching order)");
    }

    const orderRef = orderQuery.docs[0].ref;

    // ✅ Firestore: update order document
    await orderRef.update({
      refundStatus: "refunded",
      paymentStatus: "refunded",
      refundAmount: amount,
      refundAt: timestamp,
      updatedAt: timestamp,
    });

    // ✅ Store refund record
    await admin
      .firestore()
      .collection("xendit_refunds")
      .doc(type)
      .collection("records")
      .doc(refundId)
      .set(
        {
          refundId,
          chargeId,
          amount,
          currency,
          status,
          eventType: event,
          type: type.toUpperCase(),
          createdAt: timestamp,
        },
        { merge: true }
      );

    console.log(`✅ Stored refund for order with chargeId: ${chargeId}`);
    return res.status(200).send(`${type.toUpperCase()} refund processed`);
  } catch (error) {
    console.error("❌ Refund webhook processing error:", error);
    return res.status(500).json({ error: "Failed to process refund webhook" });
  }
}
