import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { refundGcashPayment } from "../../utils/refundGcashPayment";
import { refundBankPayment } from "../../utils/refundBankPayment";

const router = Router();

router.post("/:orderId/cancel", verifyFirebaseToken, async (req: CustomRequest, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.uid;

    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();

    if (!order || !order.merchantId || !order.customerId) {
      return res.status(400).json({ error: "Invalid order data." });
    }

    const isMerchant = order.merchantId === userId;
    const isCustomer = order.customerId === userId;

    if (!isMerchant && !isCustomer) {
      return res.status(403).json({ error: "You are not authorized to cancel this order." });
    }

    if (["cancelled", "delivered"].includes(order.status)) {
      return res.status(400).json({ error: `Order is already ${order.status}.` });
    }

    if (order.status === "accepted_by_merchant") {
      return res.status(400).json({
        error: "Cannot cancel an order that has already been accepted by the merchant.",
      });
    }

    if (order.status === "awaiting_payment") {
      const expiresAt = order.expiresAt?.toDate?.();
      if (expiresAt && new Date() > expiresAt) {
        return res.status(400).json({
          error: "Payment window has already expired. Please wait for automatic cancellation.",
        });
      }
    }

    const chargeId = order.xenditChargeId;
    const amount = order.price;

    // ✅ Use Xendit-approved reason
    const xenditReason: "REQUESTED_BY_CUSTOMER" = "REQUESTED_BY_CUSTOMER";

    if (order.paymentStatus === "paid") {
      if (!chargeId || !amount) {
        return res.status(500).json({ error: "Missing chargeId or price for refund." });
      }

      try {
        if (order.paymentMethod === "GCash") {
          await refundGcashPayment({
            chargeId,
            amount,
            reason: xenditReason,
          });
        }

        if (order.paymentMethod === "Bank") {
          await refundBankPayment({
            chargeId,
            amount,
            reason: xenditReason,
          });
        }
      } catch (refundError: any) {
        const rawError =
          refundError?.response?.data || refundError?.message || "Unknown refund error";

        console.error("❌ Refund failed:", rawError);

        return res.status(500).json({
          error: `${order.paymentMethod} refund failed. Please contact support.`,
          details: rawError,
        });
      }
    }

    // ✅ Final cancellation update
    await orderRef.update({
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: isMerchant ? "merchant" : "customer",
    });

    return res.status(200).json({
      message: `Order cancelled by ${isMerchant ? "merchant" : "customer"}. Refund issued if applicable.`,
    });
  } catch (err: any) {
    console.error("❌ Error cancelling order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
