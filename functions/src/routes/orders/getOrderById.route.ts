import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   GET /orders/:id
 * @desc    Get single order by ID
 * @access  Authenticated
 */
router.get("/:id", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  const { id } = req.params;

  try {
    const doc = await admin.firestore().collection("orders").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const order = { orderId: doc.id, ...doc.data() };
    return res.status(200).json({ order });
  } catch (err) {
    console.error("❌ Failed to fetch order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
