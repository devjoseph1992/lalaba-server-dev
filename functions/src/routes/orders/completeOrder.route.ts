import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { collectHeldAmount } from "../../services/walletService";

const router = Router();

router.post("/order/:orderId/complete-order", verifyFirebaseToken, async (req, res) => {
  try {
    const { orderId } = req.params;

    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();

    if (!order || !order.merchantId || !order.riderId) {
      return res.status(400).json({ error: "Invalid order data. Missing merchant or rider info." });
    }

    await collectHeldAmount(order.merchantId, "merchant");
    await collectHeldAmount(order.riderId, "rider");

    await orderRef.update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: "Order completed. Platform fees collected.",
    });
  } catch (err) {
    console.error("❌ Error completing order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
