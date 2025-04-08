import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { hasBalance } from "../../middleware/hasBalance";
import { deductAndHold } from "../../services/walletService";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /order/:orderId/accept-merchant
 * @desc    Merchant accepts an order and platform fee is held
 * @access  Authenticated
 */
router.post(
  "/order/:orderId/accept-merchant",
  verifyFirebaseToken,
  hasBalance,
  async (req: CustomRequest, res: Response): Promise<Response | void> => {
    try {
      const { orderId } = req.params;
      const merchantId = req.user?.uid;

      if (!merchantId) {
        return res.status(401).json({ error: "Unauthorized: Missing merchant ID." });
      }

      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const order = orderSnap.data();

      if (!order || order.merchantId !== merchantId) {
        return res.status(403).json({ error: "Not authorized to accept this order." });
      }

      // 💰 Estimate cost based on fixed kilo (before update)
      const estimatedKilo = 5;
      const baseRate = order.washType === "Premium Wash" ? 130 : 100;
      const estimatedPrice = baseRate * estimatedKilo;
      const platformFee = estimatedPrice * 0.2;

      // 💸 Hold merchant fee
      await deductAndHold(merchantId, platformFee, "merchant");

      // ✅ Update order status
      await orderRef.update({
        status: "accepted_by_merchant",
        merchantAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        estimatedPlatformFee: platformFee,
      });

      return res.status(200).json({
        message: "Merchant accepted order. Platform fee held.",
      });
    } catch (err) {
      console.error("❌ Accept merchant error:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
