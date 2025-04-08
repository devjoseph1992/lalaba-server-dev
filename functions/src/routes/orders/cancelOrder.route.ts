import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { releaseHold } from "../../services/walletService";

const router = Router();

router.post("/order/:orderId/cancel", verifyFirebaseToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();

    if (!order || !order.merchantId) {
      return res.status(400).json({ error: "Invalid order data. Missing merchantId." });
    }

    await releaseHold(order.merchantId);

    if (order.riderId) {
      await releaseHold(order.riderId);
    }

    await orderRef.update({
      status: "cancelled",
      cancelledAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: "Order cancelled. Platform fees refunded.",
    });
  } catch (err) {
    console.error("❌ Error cancelling order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
