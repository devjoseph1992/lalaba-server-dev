// functions/src/routes/orders/book-rider.ts

import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isMerchant } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { z } from "zod";

const router = Router();

// ✅ Zod schema to validate the body
const bookRiderSchema = z.object({
  orderId: z.string().min(1),
  deliveryType: z.literal("delivery"),
  customerLocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
});

router.post(
  "/orders/book-rider",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const merchantId = req.user?.uid;
      if (!merchantId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // ✅ Validate input using Zod
      const parsed = bookRiderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { orderId } = parsed.data; // 🔧 only using orderId for now

      // 🔍 Get merchant's business details
      const detailsRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("info")
        .doc("details");

      const detailsSnap = await detailsRef.get();
      const detailsData = detailsSnap.data();

      if (!detailsSnap.exists || !detailsData?.orderTypeDelivery) {
        return res.status(403).json({ error: "Merchant has not enabled delivery." });
      }

      // 📦 Get the order
      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      // 🚚 Dummy rider assignment logic (to be replaced with matching logic later)
      const riderId = "AUTO-ASSIGNED-RIDER-ID";

      // ✅ Update the order with rider
      await orderRef.update({
        deliveryType: "delivery",
        riderId,
        status: "assigned-to-rider",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        message: "✅ Rider booked successfully.",
        riderId,
      });
    } catch (error) {
      console.error("❌ Error booking rider:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
