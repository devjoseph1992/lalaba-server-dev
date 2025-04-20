import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   GET /orders/:id/rider-status
 * @desc    Get the current rider's status for a given order from subcollection
 * @access  Authenticated
 */
router.get("/:id/rider-status", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  const orderId = req.params.id;
  const riderId = req.user?.uid;

  if (!riderId) {
    return res.status(401).json({ error: "Unauthorized. No rider UID found." });
  }

  try {
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const riderDocRef = orderRef.collection("riders").doc(riderId);

    const [riderDocSnap, orderDocSnap] = await Promise.all([riderDocRef.get(), orderRef.get()]);

    if (!orderDocSnap.exists) {
      return res.status(404).json({ error: "Order not found." });
    }

    const orderData = orderDocSnap.data();

    if (!riderDocSnap.exists) {
      return res.status(200).json({
        status: null,
        message: "No rider record yet for this order.",
        isCurrentRider: false,
      });
    }

    const riderData = riderDocSnap.data();

    return res.status(200).json({
      riderId,
      name: riderData?.name || "",
      vehicle: riderData?.vehicle || "",
      plateNumber: riderData?.plateNumber || "",
      status: riderData?.status || null,
      acceptedAt: riderData?.acceptedAt || null,
      isCurrentRider: orderData?.currentRiderId === riderId,
    });
  } catch (err) {
    console.error("❌ Failed to get rider status:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
