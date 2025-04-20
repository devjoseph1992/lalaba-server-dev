import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

// 🛵 Rider View: Get all merchant-accepted orders
router.get("/available", verifyFirebaseToken, async (req: CustomRequest, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("orders")
      .where("status", "==", "accepted_by_merchant")
      .get();

    const orders = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ orders });
  } catch (err) {
    console.error("❌ Fetch available orders error:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
