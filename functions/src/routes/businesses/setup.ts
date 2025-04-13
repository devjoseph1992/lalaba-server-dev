import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isMerchant } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { businessSetupSchema } from "../../schema/businessValidation";

const router = Router();

router.post(
  "/setup",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // ✅ Validate request body using Zod
      const validation = businessSetupSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        });
      }

      const {
        businessName,
        barangay,
        city,
        exactAddress,
        coordinates,
        imageUrl,
        phoneNumber,
        openingHours,
        orderTypeDelivery,
        status,
      } = validation.data;

      const now = admin.firestore.FieldValue.serverTimestamp();

      const businessRef = admin.firestore().collection("businesses").doc(userId);
      const detailsRef = businessRef.collection("info").doc("details");

      // 🔍 Fetch existing docs to preserve createdAt
      const [businessSnap, detailsSnap] = await Promise.all([businessRef.get(), detailsRef.get()]);

      const existingRoot = businessSnap.exists ? businessSnap.data() : null;
      const existingDetails = detailsSnap.exists ? detailsSnap.data() : null;

      // ✅ Set root business document
      await businessRef.set(
        {
          createdAt: existingRoot?.createdAt || now,
          updatedAt: now,
          isOnline: existingRoot?.isOnline ?? false,
        },
        { merge: true }
      );

      // ✅ Set business info/details document
      await detailsRef.set(
        {
          businessName,
          barangay,
          city,
          exactAddress,
          coordinates,
          imageUrl: imageUrl || null,
          phoneNumber,
          openingHours,
          orderTypeDelivery, // ✅ Delivery (true) / Pick-up (false)
          status: typeof status === "boolean" ? status : false,
          createdAt: existingDetails?.createdAt || now,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.status(200).json({ message: "Business setup completed." });
    } catch (err) {
      console.error("❌ Failed to setup business:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
