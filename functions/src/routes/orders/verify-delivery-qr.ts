import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/verify-delivery-qr
 * @desc    Rider scans QR to verify delivery intent
 * @access  Authenticated (Riders only)
 */
router.post(
  "/verify-delivery-qr",
  verifyFirebaseToken,
  async (req: CustomRequest, res: Response) => {
    try {
      const { qrPayload } = req.body;
      const riderId = req.user?.uid;

      if (!qrPayload || typeof qrPayload !== "object") {
        return res.status(400).json({ error: "Missing or invalid QR payload." });
      }

      const { orderId, type } = qrPayload;

      if (!orderId || type !== "delivery_verify") {
        return res.status(400).json({ error: "Invalid QR payload format." });
      }

      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const orderData = orderSnap.data();
      if (!orderData || orderData.currentRiderId !== riderId) {
        return res.status(403).json({ error: "You are not assigned to this order." });
      }

      const qrSecureRef = orderRef.collection("secure").doc("qr");
      const qrSnap = await qrSecureRef.get();

      if (!qrSnap.exists) {
        return res.status(404).json({ error: "QR code not found for this order." });
      }

      const qrData = qrSnap.data();
      if (!qrData) {
        return res.status(404).json({ error: "QR data is missing or corrupted." });
      }

      if (qrData.usedAt) {
        return res.status(409).json({ error: "QR code has already been used." });
      }

      // ✅ Mark QR as used
      await qrSecureRef.update({
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        usedBy: riderId,
      });

      return res.status(200).json({
        message: "✅ QR code verified. You can now proceed with delivery submission.",
        orderId,
      });
    } catch (err) {
      console.error("❌ QR verification failed:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
