import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";

const router = Router();

// ✅ GET /orders/payment-status/:orderId
router.get("/payment-status/:orderId", verifyFirebaseToken, async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId." });
    }

    const orderSnap = await admin.firestore().collection("orders").doc(orderId).get();

    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();

    return res.status(200).json({
      status: order?.status,
      paymentStatus: order?.paymentStatus,
    });
  } catch (err: any) {
    console.error("❌ Error fetching payment status:", err.message);
    return res.status(500).json({ error: "Failed to fetch payment status." });
  }
});

export default router;
