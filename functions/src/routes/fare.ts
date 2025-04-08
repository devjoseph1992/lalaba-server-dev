// functions/src/routes/fare.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../middleware/auth";
import { encrypt, decrypt } from "../utils/encryption";

const router = Router();

/**
 * ✅ Calculate Distance (Haversine Formula)
 */
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * ✅ Rider Picks Up the Order (Deduct 20% Fee & Hold Until Completion)
 */
router.post("/pickup", verifyFirebaseToken, async (req, res) => {
  try {
    const { orderId, customerLocation, merchantId } = req.body;
    const riderId = req.user?.uid;

    if (!riderId || !orderId || !customerLocation || !merchantId) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // ✅ Fetch Merchant Location
    const merchantRef = admin.firestore().collection("users").doc(merchantId);
    const merchantSnapshot = await merchantRef.get();

    if (!merchantSnapshot.exists) {
      return res.status(404).json({ error: "Merchant not found." });
    }

    const merchantLocation = merchantSnapshot.data()?.location;
    if (!merchantLocation?.latitude || !merchantLocation?.longitude) {
      return res.status(400).json({ error: "Merchant location is missing." });
    }

    // ✅ Calculate Distance (Customer → Merchant)
    const distance = calculateDistance(
      customerLocation.latitude,
      customerLocation.longitude,
      merchantLocation.latitude,
      merchantLocation.longitude
    );

    // ✅ Calculate Fare
    const baseFare = 49;
    const additionalDistanceFee = Math.ceil(distance / 5) * 30; // ₱30 per 5km
    const totalFare = baseFare + additionalDistanceFee;
    const platformFee = totalFare * 0.2; // 20% Platform Fee

    console.log(
      `✅ Distance: ${distance.toFixed(2)} km | Fare: ₱${totalFare} | Platform Fee: ₱${platformFee}`
    );

    // ✅ Fetch Rider's Wallet
    const walletRef = admin.firestore().collection("wallets").doc(riderId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      return res.status(404).json({ error: "Rider wallet not found." });
    }

    const walletData = walletSnapshot.data();
    const currentBalance = parseFloat(decrypt(walletData!.balance));

    if (currentBalance < platformFee) {
      return res.status(400).json({ error: "Insufficient wallet balance to cover platform fee." });
    }

    const newBalance = currentBalance - platformFee;

    // ✅ Deduct 20% Platform Fee & Hold Until Order Completion
    await walletRef.update({
      balance: encrypt(newBalance.toString()),
      holdAmount: encrypt(platformFee.toString()),
      holdUntil: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 60 * 1000) // Hold for 30 mins
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ Update Order Status
    const orderRef = admin.firestore().collection("orders").doc(orderId);
    await orderRef.update({
      status: "picked_up",
      riderId,
      platformFee,
      holdUntil: admin.firestore.Timestamp.fromDate(new Date(Date.now() + 30 * 60 * 1000)),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Platform Fee ₱${platformFee} deducted & held until order completion for Rider ${riderId}.`
    );

    return res.status(200).json({
      message: `Order picked up. Platform fee of ₱${platformFee} deducted and on hold.`,
      totalFare,
      platformFee,
      newBalance,
    });
  } catch (error) {
    console.error("❌ Error processing pickup:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
