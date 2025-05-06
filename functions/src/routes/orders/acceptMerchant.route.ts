import { Response, Router } from "express";
import * as admin from "firebase-admin";
import * as QRCode from "qrcode";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { sendOrderStatusNotification } from "../../utils/sendOrderStatusNotification"; // <-- import this

const router = Router();

router.post(
  "/:orderId/accept-merchant",
  verifyFirebaseToken,
  async (req: CustomRequest, res: Response): Promise<Response> => {
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

      const estimatedPrice =
        typeof order.price === "string" ? parseFloat(order.price) : order.price;

      if (!estimatedPrice || isNaN(estimatedPrice)) {
        return res.status(400).json({ error: "Invalid order price." });
      }

      const platformFee = parseFloat((estimatedPrice * 0.2).toFixed(2));

      // ✅ Generate QR Code
      const qrPayload = {
        orderId,
        type: "delivery_verify",
      };

      const qrCodeDataURL = await QRCode.toDataURL(JSON.stringify(qrPayload));

      // ✅ Save QR Code securely
      const qrSecureRef = orderRef.collection("secure").doc("qr");
      await qrSecureRef.set({
        qrCode: qrCodeDataURL,
        type: "delivery_verify",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // ✅ Update order status
      await orderRef.update({
        status: "accepted_by_merchant",
        merchantAcceptedAt: admin.firestore.FieldValue.serverTimestamp(),
        platformFeeEstimate: platformFee,
        deliveryQRGenerated: true,
      });

      console.log(`✅ Order accepted: ${orderId} by ${merchantId} (QR saved to secure/)`);

      // 🔥 Send push notification to customer
      if (order.customerId) {
        await sendOrderStatusNotification(order.customerId, orderId, "accepted_by_merchant");
      }

      return res.status(200).json({
        message: "Order accepted, QR code generated, and notification sent.",
        platformFee,
        qrCodeStoredIn: `orders/${orderId}/secure/qr`,
      });
    } catch (err) {
      console.error("❌ Error accepting order:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
