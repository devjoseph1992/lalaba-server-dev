import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /order/:orderId/update-weight
 * @desc    Update the actual kilos of an order and calculate final price & platform fee
 * @access  Authenticated
 */
router.post(
  "/order/:orderId/update-weight",
  verifyFirebaseToken,
  async (req: CustomRequest, res) => {
    try {
      const { orderId } = req.params;
      const { actualKilo } = req.body;

      if (!actualKilo || actualKilo <= 0) {
        return res.status(400).json({ error: "Actual kilo is required and must be positive." });
      }

      const orderRef = admin.firestore().collection("orders").doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return res.status(404).json({ error: "Order not found." });
      }

      const order = orderSnap.data();
      const merchantId = order?.merchantId;
      const washType = order?.washType;

      if (!merchantId || !washType) {
        return res.status(400).json({ error: "Order is missing merchant or wash type." });
      }

      // 🔍 Get the correct service from /businesses/{merchantId}/services where name == washType
      const servicesSnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("services")
        .where("name", "==", washType)
        .limit(1)
        .get();

      if (servicesSnap.empty) {
        return res
          .status(404)
          .json({ error: `Wash type "${washType}" not found in merchant services.` });
      }

      const service = servicesSnap.docs[0].data();
      const baseRate = parseFloat(service.price);

      if (isNaN(baseRate)) {
        return res.status(400).json({ error: "Invalid service price format in Firestore." });
      }

      const finalPrice = baseRate * actualKilo;
      const finalPlatformFee = finalPrice * 0.2;

      await orderRef.update({
        actualKilo,
        finalPrice,
        finalPlatformFee,
        status: "waiting_for_completion",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({
        message: "Weight updated successfully.",
        finalPrice,
        finalPlatformFee,
        actualKilo,
      });
    } catch (err) {
      console.error("❌ Error updating weight:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
