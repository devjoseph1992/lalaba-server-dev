import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/:orderId/set-completion-time
 * @desc    Merchant sets completion time after laundry is ready (only for delivery-type orders)
 * @access  Authenticated (Merchant only)
 */
router.post(
  "/:orderId/set-completion-time",
  verifyFirebaseToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const { orderId } = req.params;
      const { completionTime } = req.body;
      const merchantId = req.user?.uid;

      if (!merchantId) {
        return res.status(401).json({ error: "Unauthorized: Missing merchant ID." });
      }

      if (!completionTime) {
        return res.status(400).json({ error: "Missing completionTime in request body." });
      }

      const parsedTime = new Date(completionTime);
      if (isNaN(parsedTime.getTime())) {
        return res.status(400).json({ error: "Invalid date format for completionTime." });
      }

      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const orderData = orderSnap.data();
      if (!orderData || orderData.merchantId !== merchantId) {
        return res.status(403).json({ error: "Not authorized to modify this order." });
      }

      if (orderData.status !== "delivered_by_rider" || orderData.orderType !== "Delivery") {
        return res.status(400).json({
          error: "You can only set completion time after delivery and for Delivery-type orders.",
        });
      }

      // ✅ Update order with completion info
      await orderRef.update({
        completionTime: parsedTime,
        completionStatus: "laundry_ready",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        message: "Completion time set successfully.",
        orderId,
        completionTime: parsedTime.toISOString(),
      });
    } catch (err) {
      console.error("❌ Error setting completion time:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
