import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { hasBalance } from "../../middleware/hasBalance";
import { deductAndHold } from "../../services/walletService";
import { CustomRequest } from "../../types/global";

const router = Router();

router.post(
  "/order/:orderId/accept-rider",
  verifyFirebaseToken,
  hasBalance,
  async (req: CustomRequest, res) => {
    try {
      const { orderId } = req.params;
      const riderId = req.user?.uid;

      if (!riderId) {
        return res.status(401).json({ error: "Unauthorized: Missing rider ID." });
      }

      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const order = orderSnap.data();

      if (!order || order.status !== "accepted_by_merchant") {
        return res.status(400).json({ error: "Order is not ready for rider." });
      }

      if (!order.riderPlatformFee) {
        return res.status(400).json({ error: "Missing rider platform fee." });
      }

      await deductAndHold(riderId, order.riderPlatformFee, "rider");

      await orderRef.update({
        status: "accepted_by_rider",
        riderId,
        riderAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        message: "Rider accepted order. Platform fee held.",
      });
    } catch (err) {
      console.error("❌ Accept rider error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
