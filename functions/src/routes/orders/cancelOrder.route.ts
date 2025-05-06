import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/:orderId/cancel
 * @desc    Cancel an order (merchant or customer) if not yet accepted or expired payment
 * @access  Authenticated
 */
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

    // ❌ Block if already delivered or cancelled
    if (["cancelled", "delivered"].includes(order.status)) {
      return res.status(400).json({ error: `Order is already ${order.status}.` });
    }

    // ❌ Block cancellation if already accepted
    if (order.status === "accepted_by_merchant") {
      return res.status(400).json({
        error: "Cannot cancel an order that has already been accepted by the merchant.",
      });
    }

    // ✅ Additional check: if awaiting_payment, check if expired
    if (order.status === "awaiting_payment") {
      const expiresAt = order.expiresAt?.toDate?.();
      const now = new Date();

      if (expiresAt && now > expiresAt) {
        return res.status(400).json({
          error: "Payment window has already expired. Please wait for automatic cancellation.",
        });
      }
    }

    await orderRef.update({
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
      cancelledBy: isMerchant ? "merchant" : "customer",
    });

    return res.status(200).json({
      message: `Order cancelled by ${isMerchant ? "merchant" : "customer"}.`,
    });
  } catch (err) {
    console.error("❌ Error cancelling order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
