// functions/src/routes/categories.ts

import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isMerchant } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { categorySchema } from "../../schema/categoryValidation";

const router = Router();

const DEFAULT_CATEGORIES = ["Detergent", "Fabric Conditioner"];

/**
 * ✅ GET all categories for current merchant
 */
router.get("/", verifyFirebaseToken, isMerchant, async (req: CustomRequest, res: Response) => {
  try {
    const merchantId = req.user!.uid;

    const snapshot = await admin
      .firestore()
      .collection("businesses")
      .doc(merchantId)
      .collection("categories")
      .orderBy("sortOrder")
      .get();

    const categories = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ categories });
  } catch (error) {
    console.error("❌ Failed to fetch categories:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ POST new category
 */
router.post("/", verifyFirebaseToken, isMerchant, async (req: CustomRequest, res: Response) => {
  try {
    const merchantId = req.user!.uid;
    const { name, icon, sortOrder } = categorySchema.parse(req.body);

    if (DEFAULT_CATEGORIES.includes(name)) {
      return res.status(400).json({
        error: `❌ Cannot create reserved category "${name}"`,
      });
    }

    const existing = await admin
      .firestore()
      .collection("businesses")
      .doc(merchantId)
      .collection("categories")
      .where("name", "==", name)
      .limit(1)
      .get();

    if (!existing.empty) {
      return res.status(400).json({ error: "❌ Category name must be unique." });
    }

    await admin.firestore().collection("businesses").doc(merchantId).collection("categories").add({
      name,
      icon,
      sortOrder,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({ message: "✅ Category added successfully." });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Validation Failed", details: err.errors });
    }

    console.error("❌ Error adding category:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ PUT category (non-default only)
 */
router.put(
  "/:categoryId",
  verifyFirebaseToken,
  isMerchant,
  async (req: CustomRequest, res: Response) => {
    try {
      const merchantId = req.user!.uid;
      const categoryId = req.params.categoryId;
      const { name, icon, sortOrder } = categorySchema.parse(req.body);

      const ref = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("categories")
        .doc(categoryId);

      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Category not found." });

      const existing = snap.data();
      if (!existing) return res.status(404).json({ error: "Invalid category data." });

      if (DEFAULT_CATEGORIES.includes(existing.name)) {
        return res.status(403).json({
          error: `❌ Cannot update default category "${existing.name}"`,
        });
      }

      await ref.update({
        name,
        icon,
        sortOrder,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return res.status(200).json({ message: "✅ Category updated successfully." });
    } catch (err: any) {
      if (err.name === "ZodError") {
        return res.status(400).json({ error: "Validation Failed", details: err.errors });
      }

      console.error("❌ Error updating category:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * 🚫 DELETE category — Not allowed for default categories
 */
router.delete(
  "/:categoryId",
  verifyFirebaseToken,
  isMerchant,
  async (req: CustomRequest, res: Response) => {
    try {
      const merchantId = req.user!.uid;
      const ref = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("categories")
        .doc(req.params.categoryId);

      const snap = await ref.get();
      if (!snap.exists) return res.status(404).json({ error: "Category not found." });

      const category = snap.data();
      if (!category) return res.status(404).json({ error: "Invalid category data." });

      if (DEFAULT_CATEGORIES.includes(category.name)) {
        return res.status(403).json({
          error: `❌ Cannot delete default category "${category.name}"`,
        });
      }

      await ref.delete();
      return res.status(200).json({ message: "✅ Category deleted successfully." });
    } catch (error) {
      console.error("❌ Failed to delete category:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Mount under `/categories`
 */
const baseRouter = Router();
baseRouter.use("/categories", router);
export default baseRouter;
