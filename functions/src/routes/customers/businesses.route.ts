// functions/src/routes/customers/businesses.ts

import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * ✅ GET all businesses with full structure:
 * - Root doc
 * - info/details
 * - services
 * - products
 * - categories
 */
router.get("/businesses", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  try {
    const businessesRef = admin.firestore().collection("businesses");
    const snapshot = await businessesRef.get();

    const businessList = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const merchantId = doc.id;
        const rootData = doc.data();

        // 🔍 info/details
        const detailsSnap = await businessesRef
          .doc(merchantId)
          .collection("info")
          .doc("details")
          .get();
        const details = detailsSnap.exists ? detailsSnap.data() : null;

        // 🔍 services
        const servicesSnap = await businessesRef.doc(merchantId).collection("services").get();
        const services = servicesSnap.docs.map((s) => ({
          id: s.id,
          ...s.data(),
        }));

        // 🔍 products
        const productsSnap = await businessesRef.doc(merchantId).collection("products").get();
        const products = productsSnap.docs.map((p) => ({
          id: p.id,
          ...p.data(),
        }));

        // 🔍 categories
        const categoriesSnap = await businessesRef.doc(merchantId).collection("categories").get();
        const categories = categoriesSnap.docs.map((c) => ({
          id: c.id,
          ...c.data(),
        }));

        return {
          merchantId,
          ...rootData,
          details,
          services,
          products,
          categories,
        };
      })
    );

    return res.status(200).json({ businesses: businessList });
  } catch (err) {
    console.error("❌ Error fetching full business data:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
