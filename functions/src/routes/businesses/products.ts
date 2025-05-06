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

      const validation = productSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        });
      }

      const { name, category, price, imageUrl, available } = validation.data;
      const now = admin.firestore.FieldValue.serverTimestamp();
      const nameLower = name.trim().toLowerCase();

      // 🔍 Validate category
      const categorySnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("categories")
        .where("nameLower", "==", category.toLowerCase())
        .limit(1)
        .get();

      if (categorySnap.empty) {
        return res.status(400).json({ error: `Category "${category}" does not exist.` });
      }

      const productRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc();

      await productRef.set({
        name,
        nameLower,
        category,
        price,
        imageUrl,
        available,
        createdAt: now,
      });

      return res.status(201).json({
        message: "✅ Product created successfully.",
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

/**
 * ✅ Update Product (PATCH)
 */
router.patch(
  "/:merchantId/products/:productId",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const { merchantId, productId } = req.params;
      const userId = req.user?.uid;

      if (!userId || userId !== merchantId) {
        return res.status(403).json({ error: "Unauthorized access to business." });
      }

      const validation = productSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: validation.error.flatten().fieldErrors,
        });
      }

      const { name, category, price, imageUrl, available } = validation.data;
      const productRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc(productId);

      const snap = await productRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Product not found." });

      // 🔍 Validate category (optional step)
      const categorySnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("categories")
        .where("nameLower", "==", category.toLowerCase())
        .limit(1)
        .get();

      if (categorySnap.empty) {
        return res.status(400).json({ error: `Category "${category}" does not exist.` });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();

      await productRef.update({
        name,
        nameLower: name.trim().toLowerCase(),
        category,
        price,
        imageUrl,
        available,
        updatedAt: now,
      });

      return res.status(200).json({ message: "✅ Product updated successfully." });
    } catch (err) {
      console.error("❌ Failed to update product:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Delete Product
 */
router.delete(
  "/:merchantId/products/:productId",
  verifyFirebaseToken,
  isMerchant,
  async (req: Request & CustomRequest, res: Response) => {
    try {
      const { merchantId, productId } = req.params;
      const userId = req.user?.uid;

      if (!userId || userId !== merchantId) {
        return res.status(403).json({ error: "Unauthorized access to business." });
      }

      const productRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc(productId);

      const snap = await productRef.get();
      if (!snap.exists) return res.status(404).json({ error: "Product not found." });

      await productRef.delete();
      return res.status(200).json({ message: "✅ Product deleted successfully." });
    } catch (err) {
      console.error("❌ Failed to delete product:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
