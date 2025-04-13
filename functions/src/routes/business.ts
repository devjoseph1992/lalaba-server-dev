import { Response, Router } from "express";
import * as admin from "firebase-admin";
import { isMerchant, verifyFirebaseToken } from "../middleware/auth";
import { CustomRequest } from "../types/global";

const router = Router();

/**
 * POST /businesses
 * Allow a merchant to create or update their business info
 */
router.post(
  "/businesses",
  verifyFirebaseToken,
  isMerchant,
  async (req: CustomRequest, res: Response) => {
    try {
      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const {
        businessName,
        barangay,
        city,
        exactAddress,
        coordinates,
        imageUrl,
        phoneNumber,
        openingHours,
        status = "true",
      } = req.body;

      // ✅ Validate required fields
      if (
        !businessName ||
        !barangay ||
        !city ||
        !exactAddress ||
        !coordinates?.lat ||
        !coordinates?.lng ||
        !phoneNumber ||
        !openingHours?.open ||
        !openingHours?.close
      ) {
        return res.status(400).json({ error: "Missing required business fields." });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const businessRef = admin.firestore().collection("businesses").doc(userId);
      const detailsRef = businessRef.collection("info").doc("details");

      // 🔍 Get current timestamps if they exist
      const [businessSnap, detailsSnap] = await Promise.all([businessRef.get(), detailsRef.get()]);

      const existingCreatedAtRoot = businessSnap.exists ? businessSnap.data()?.createdAt : null;
      const existingCreatedAtDetails = detailsSnap.exists ? detailsSnap.data()?.createdAt : null;

      // 🧾 Root timestamps
      await businessRef.set(
        {
          createdAt: existingCreatedAtRoot || now,
          updatedAt: now,
        },
        { merge: true }
      );

      // 🧾 Info/details document
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
          status,
          createdAt: existingCreatedAtDetails || now,
          updatedAt: now,
        },
        { merge: true }
      );

      return res.status(200).json({ message: "Business info saved successfully." });
    } catch (err) {
      console.error("❌ Failed to save business info:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
