import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/:orderId/complete-return
 * @desc    Rider completes the return delivery (final step)
 * @access  Authenticated (Rider only)
 */
router.post(
  "/:orderId/complete-return",
  verifyFirebaseToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { photoUrls = [] } = req.body;
      const riderId = req.user?.uid;

      if (!riderId) {
        return res.status(401).json({ error: "Unauthorized: No rider ID found." });
      }

      // Fetch the order
      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const order = orderSnap.data();

      if (!order || order.currentRiderId !== riderId) {
        return res.status(403).json({ error: "You are not authorized to complete this order." });
      }

      if (order.status !== "awaiting_rider_return") {
        return res.status(400).json({ error: "Order is not in a returnable state." });
      }

      // Store proof in subcollection
      const proofRef = orderRef.collection("deliveryBackBooking").doc("returnProof");
      await proofRef.set({
        photoUrls,
        completedBy: riderId,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update order status to completed
      await orderRef.update({
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        message: "Order return completed successfully.",
        orderId,
        status: "completed",
      });
    } catch (err) {
      console.error("❌ Error completing return:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
