import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/:orderId/deliver
 * @desc    Rider submits delivery form after QR scan
 * @access  Authenticated (Riders only)
 */
router.post("/:orderId/deliver", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  try {
    const { orderId } = req.params;
    const riderId = req.user?.uid;
    const { actualWeight, photoUrls = [] } = req.body;

    if (!riderId) {
      return res.status(401).json({ error: "Unauthorized. Rider ID missing." });
    }

    if (!actualWeight || typeof actualWeight !== "number" || actualWeight <= 0) {
      return res.status(400).json({ error: "Invalid or missing actual weight." });
    }

    if (!Array.isArray(photoUrls)) {
      return res.status(400).json({ error: "photoUrls must be an array." });
    }

    // 🔍 Fetch order
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();
    if (!order || order.currentRiderId !== riderId) {
      return res.status(403).json({ error: "Not authorized to submit this delivery." });
    }

    // 🔐 QR Verification Timestamp
    const qrSnap = await orderRef.collection("secure").doc("qr").get();
    const qrData = qrSnap.data();
    const qrUsedAt = qrData?.usedAt?.toDate?.();
    const now = new Date();

    if (!qrUsedAt || now.getTime() - qrUsedAt.getTime() > 10 * 60 * 1000) {
      return res.status(403).json({
        error: "QR code expired. Please re-scan before submitting delivery.",
      });
    }

    // 💰 Calculate new final price
    const pricePerKilo =
      typeof order.price === "string"
        ? parseFloat(order.price) / order.estimatedKilo
        : order.price / order.estimatedKilo;

    const recalculatedPrice = parseFloat((pricePerKilo * actualWeight).toFixed(2));

    const updatePayload: Record<string, any> = {
      actualWeight,
      deliveryPhotos: photoUrls,
      price: recalculatedPrice,
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "delivered_by_rider",
    };

    await orderRef.update(updatePayload);

    return res.status(200).json({
      message: "✅ Delivery submitted successfully.",
      recalculatedPrice,
      updatedFields: updatePayload,
    });
  } catch (err) {
    console.error("❌ Failed to submit delivery:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
