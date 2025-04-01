// functions/src/routes/merchantStore.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../middleware/auth";

const router = Router();

/**
 * ✅ Middleware: Allow Admins & Merchants to Add Stores
 */
const isAdminOrMerchant = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();
    const userRole = userSnapshot.data()?.role;

    if (
      !userSnapshot.exists ||
      (userRole !== "merchant" && userRole !== "admin")
    ) {
      return res
        .status(403)
        .json({ error: "Access denied. Only Admins & Merchants allowed." });
    }

    req.user.role = userRole; // Store role in request object for further processing
    next();
  } catch (error) {
    console.error("❌ Error checking user role:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * ✅ Add or Update Merchant Store (Admins & Merchants Can Add)
 */
router.post(
  "/store/add",
  verifyFirebaseToken,
  isAdminOrMerchant,
  async (req, res) => {
    try {
      const { storeName, location, services, extras, merchantId } = req.body;
      let ownerId = req.user?.uid;

      if (req.user && req.user.role === "admin") {
        if (!merchantId) {
          return res
            .status(400)
            .json({ error: "Merchant ID is required for admins." });
        }
        ownerId = merchantId; // Admin is adding store for a merchant
      }

      if (!ownerId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!storeName || !location || !services) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const storeRef = admin
        .firestore()
        .collection("merchant_stores")
        .doc(ownerId);

      await storeRef.set(
        {
          merchantId: ownerId,
          storeName,
          location,
          services, // Example: { "Premium Wash": { price: 650, description: "High-quality wash" } }
          extras, // Example: { soap: { Dove: 10, Safeguard: 12 } }
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`✅ Merchant store added/updated: ${ownerId}`);
      return res.status(201).json({ message: "Store added successfully." });
    } catch (error) {
      console.error("❌ Error adding store:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Get Merchant Store Details
 * - Merchants can only fetch their own store.
 * - Admins can fetch any merchant's store by providing `merchantId`.
 */
router.get("/store", verifyFirebaseToken, async (req, res) => {
  try {
    const requesterId = req.user?.uid;
    const merchantId = (req.query.merchantId as string) || requesterId; // Admin can pass merchantId

    if (!merchantId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (!requesterId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRef = admin.firestore().collection("users").doc(requesterId);
    const userSnapshot = await userRef.get();
    const userRole = userSnapshot.data()?.role;

    if (userRole !== "admin" && merchantId !== requesterId) {
      return res.status(403).json({
        error: "Access denied. Merchants can only fetch their own store.",
      });
    }

    const storeRef = admin
      .firestore()
      .collection("merchant_stores")
      .doc(merchantId);
    const storeSnapshot = await storeRef.get();

    if (!storeSnapshot.exists) {
      return res.status(404).json({ error: "Store not found." });
    }

    return res.status(200).json(storeSnapshot.data());
  } catch (error) {
    console.error("❌ Error fetching store:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
