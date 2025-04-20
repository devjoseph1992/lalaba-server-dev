import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/verify-return-qr
 * @desc    Rider scans QR at merchant to start return delivery
 * @access  Authenticated (Rider only)
 */
router.post("/verify-return-qr", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  try {
    const { qrPayload } = req.body;
    const riderId = req.user?.uid;

    if (!qrPayload || typeof qrPayload !== "object" || qrPayload.type !== "return_delivery_qr") {
      return res.status(400).json({ error: "Invalid or missing QR payload." });
    }

    const { orderId } = qrPayload;
    if (!orderId) {
      return res.status(400).json({ error: "Missing orderId in QR payload." });
    }

    // 🔎 Validate order
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();

    if (!orderSnap.exists) return res.status(404).json({ error: "Order not found." });

    const orderData = orderSnap.data();
    if (!orderData || orderData.returnCurrentRiderId !== riderId) {
      return res
        .status(403)
        .json({ error: "You are not the assigned return rider for this order." });
    }

    // 🔐 Get QR from secure location
    const qrSecureRef = orderRef.collection("deliveryBackBooking").doc("secureQr");
    const qrSnap = await qrSecureRef.get();

    if (!qrSnap.exists) {
      return res.status(404).json({ error: "QR code not found for this return delivery." });
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

    // ✅ Update order status
    await orderRef.update({
      status: "return_picked_up",
      returnPickupTime: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      message: "Return QR verified. Rider can proceed to deliver laundry to customer.",
      orderId,
    });
  } catch (err) {
    console.error("❌ Error verifying return QR:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
