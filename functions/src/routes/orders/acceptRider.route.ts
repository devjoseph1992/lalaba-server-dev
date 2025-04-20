import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   POST /orders/:id/accept
 * @desc    Rider accepts an order
 * @access  Authenticated
 */
router.post("/:id/accept", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  const { id: orderId } = req.params;
  const riderId = req.user?.uid;

  if (!riderId) {
    return res.status(401).json({ error: "Unauthorized. Rider not authenticated." });
  }

  try {
    // 1. Validate order
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) return res.status(404).json({ error: "Order not found." });

    // 2. Get rider info
    const riderSnap = await admin.firestore().collection("users").doc(riderId).get();
    if (!riderSnap.exists) return res.status(404).json({ error: "Rider profile not found." });

    const riderData = riderSnap.data() || {};
    const name = `${riderData.firstName || ""} ${riderData.lastName || ""}`.trim();
    const plateNumber = riderData.plateNumber || "N/A";
    const vehicle = riderData.vehicleUnit || "Unknown"; // ✅ Using vehicleUnit now

    // 3. Save rider data in subcollection
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    const riderEntry = {
      riderId,
      name,
      plateNumber,
      vehicle,
      status: "accepted",
      acceptedAt: timestamp,
    };

    await orderRef.collection("riders").doc(riderId).set(riderEntry);

    // 4. Update main order doc
    await orderRef.update({
      currentRiderId: riderId,
      currentRiderName: name,
      currentRiderPlate: plateNumber,
      currentRiderVehicle: vehicle,
      status: "accepted_by_rider",
      acceptedAt: timestamp,
    });

    return res.status(200).json({ message: "✅ Order accepted", rider: riderEntry });
  } catch (err) {
    console.error("❌ Failed to accept order:", err);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
