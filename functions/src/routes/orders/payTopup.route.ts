// src/routes/orders/payTopup.route.ts
import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { createGcashPreorderPayment } from "../../utils/gcashPreorder";
import { decrypt } from "../../utils/encryption";

const router = Router();

/**
 * @route   POST /orders/:orderId/pay-topup
 * @desc    Customer pays additional amount if order underpaid
 * @access  Authenticated (Customer only)
 */
router.post("/:orderId/pay-topup", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized." });
    }

    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();

    if (!order || order.customerId !== userId) {
      return res.status(403).json({ error: "Not authorized to pay for this order." });
    }

    if (
      order.paymentStatus !== "underpaid" ||
      !order.additionalAmountDue ||
      order.additionalAmountDue <= 0
    ) {
      return res.status(400).json({ error: "This order has no pending top-up payment." });
    }

    // 🔍 Fetch customer's saved GCash number
    const paymentSnap = await admin
      .firestore()
      .collection("payment_methods")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (paymentSnap.empty) {
      return res.status(400).json({ error: "No GCash number saved in payment methods." });
    }

    const gcashData = paymentSnap.docs[0].data();
    if (!gcashData.gcashNumber) {
      return res.status(400).json({ error: "GCash number is required." });
    }

    let customerPhone: string;
    try {
      customerPhone = decrypt(gcashData.gcashNumber);
    } catch {
      return res.status(500).json({ error: "Failed to decrypt GCash number." });
    }

    // ✅ Create GCash checkout for the additional amount
    const { checkoutUrl, referenceId } = await createGcashPreorderPayment({
      amount: parseFloat(order.additionalAmountDue.toFixed(2)),
      customerId: userId,
      customerPhone,
    });

    // 🛠️ Save the new top-up reference ID inside order
    await orderRef.update({
      topUpReferenceId: referenceId,
      topUpStatus: "pending",
      topUpCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: "Top-up GCash checkout created successfully",
      checkoutUrl,
      referenceId,
    });
  } catch (err: any) {
    console.error("❌ Error creating top-up payment:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
