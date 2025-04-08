import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   GET /orders/customer
 * @desc    Fetch orders placed by the authenticated customer
 * @access  Authenticated (customer only)
 */
router.get("/orders/customer", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  try {
    const customerId = req.user?.uid;

    if (!customerId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const ordersRef = admin
      .firestore()
      .collection("orders")
      .where("userId", "==", customerId)
      .orderBy("createdAt", "desc");

    const ordersSnapshot = await ordersRef.get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("❌ Error fetching customer orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
