import { Router, Request, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isMerchant } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { productSchema } from "../../schema/productValidation";

const router = Router();

/**
 * ✅ Add Product (POST)
 */
router.post(
  "/:merchantId/products",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const { merchantId } = req.params;
      const userId = req.user?.uid;

      if (!userId || userId !== merchantId) {
        return res.status(403).json({ error: "Unauthorized access to business." });
      }

      console.log("📦 Incoming product payload:", req.body);

      const validation = productSchema.safeParse(req.body);
      if (!validation.success) {
        console.error("❌ Product validation error:", validation.error.flatten().fieldErrors);
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        });
      }

      const { name, category, price, imageUrl, available } = validation.data;
      const now = admin.firestore.FieldValue.serverTimestamp();

      const categorySnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("categories")
        .where("name", "==", category)
        .limit(1)
        .get();

      if (categorySnap.empty) {
        return res.status(400).json({
          error: `Category "${category}" does not exist. Please select a valid category.`,
        });
      }

      const productRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc();

      await productRef.set({
        name,
        category,
        price,
        imageUrl,
        available,
        createdAt: now,
      });

      console.log("✅ Product successfully added:", { name, category, price });
      return res.status(201).json({
        message: "Product created successfully.",
        id: productRef.id,
      });
    } catch (err) {
      console.error("❌ Failed to add product:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Get All Products (GET)
 */
router.get(
  "/:merchantId/products",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const { merchantId } = req.params;
      const userId = req.user?.uid;

      if (!userId || userId !== merchantId) {
        return res.status(403).json({ error: "Unauthorized access to business." });
      }

      const snapshot = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .orderBy("createdAt", "desc")
        .get();

      const products = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({ products });
    } catch (err) {
      console.error("❌ Failed to fetch products:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
