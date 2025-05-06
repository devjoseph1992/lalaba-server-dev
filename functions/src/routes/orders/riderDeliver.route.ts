// routes/order/deliver.ts
import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { sendOrderStatusNotification } from "../../utils/sendOrderStatusNotification";
import { refundExcessPayment } from "../../utils/xenditRefund"; // ✅ Important: Refund Helper

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

    // 🔍 Fetch Order
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = orderSnap.data();
    if (!order || order.currentRiderId !== riderId) {
      return res.status(403).json({ error: "Not authorized to submit this delivery." });
    }

    // 🔒 Validate QR Scan
    const qrSnap = await orderRef.collection("secure").doc("qr").get();
    const qrData = qrSnap.data();
    const qrUsedAt = qrData?.usedAt?.toDate?.();
    const now = new Date();

    if (!qrUsedAt || now.getTime() - qrUsedAt.getTime() > 10 * 60 * 1000) {
      return res
        .status(403)
        .json({ error: "QR code expired. Please re-scan before submitting delivery." });
    }

    // 💵 Recalculate Final Price
    const pricePerKilo =
      typeof order.price === "string"
        ? parseFloat(order.price) / order.estimatedKilo
        : order.price / order.estimatedKilo;

    const recalculatedPrice = parseFloat((pricePerKilo * actualWeight + order.riderFee).toFixed(2));

    // 🔥 Prepare update payload
    const updatePayload: Record<string, any> = {
      actualWeight,
      deliveryPhotos: photoUrls,
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "delivered_by_rider",
      price: recalculatedPrice,
    };

    // 📦 Handle GCash adjustment
    if (order.paymentMethod === "GCash" && order.paymentStatus === "paid") {
      const oldPaidAmount = order.price;
      const overpaidAmount = parseFloat((oldPaidAmount - recalculatedPrice).toFixed(2));
      const underpaidAmount = parseFloat((recalculatedPrice - oldPaidAmount).toFixed(2));

      if (overpaidAmount > 0.01) {
        // 🛡 Refund customer the extra
        try {
          await refundExcessPayment({
            paymentRequestId: order.paymentChargeId,
            amount: overpaidAmount,
          });

          updatePayload.paymentStatus = "refunded";
          updatePayload.refundAmount = overpaidAmount;

          console.log(`✅ Refunded ₱${overpaidAmount} for Order: ${orderId}`);
        } catch (err: any) {
          console.error("❌ Refund failed:", err.message);
          return res.status(500).json({ error: "Refund failed", details: err.message });
        }
      } else if (underpaidAmount > 0.01) {
        // 🚨 Customer underpaid
        updatePayload.paymentStatus = "underpaid";
        updatePayload.additionalAmountDue = underpaidAmount;

        console.warn(`⚠️ Customer underpaid ₱${underpaidAmount} for Order: ${orderId}`);
      } else {
        // 🟰 Paid exactly correct amount
        updatePayload.paymentStatus = "paid";
      }
    }

    // 🔄 Update Firestore Order
    await orderRef.update(updatePayload);

    // 📢 Send Notification to Customer
    if (order.customerId) {
      await sendOrderStatusNotification(order.customerId, orderId, "delivered_by_rider");
    }

    return res.status(200).json({
      message: "✅ Delivery submitted successfully.",
      recalculatedPrice,
      updatedFields: updatePayload,
    });
  } catch (err: any) {
    console.error("❌ Failed to submit delivery:", err.message);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
