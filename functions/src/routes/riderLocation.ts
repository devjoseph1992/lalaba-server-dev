// functions/src/routes/riderLocation.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../middleware/auth";

const router = Router();

/**
 * ✅ Update Rider's Live Location (Realtime Database)
 */
router.post("/rider/location", verifyFirebaseToken, async (req, res) => {
  try {
    const riderId = req.user?.uid;
    const { latitude, longitude } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ error: "Latitude and Longitude are required." });
    }

    // ✅ Save rider's location in Realtime Database
    await admin.database().ref(`/rider_locations/${riderId}`).set({
      latitude,
      longitude,
      updatedAt: admin.database.ServerValue.TIMESTAMP,
    });

    console.log(`✅ Rider ${riderId} location updated.`);
    return res.status(200).json({ message: "Location updated successfully." });
  } catch (error) {
    console.error("❌ Error updating rider location:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ Get All Riders' Live Locations
 */
router.get("/riders/locations", verifyFirebaseToken, async (req, res) => {
  try {
    const snapshot = await admin.database().ref("/rider_locations").once("value");
    const riders = snapshot.val();

    if (!riders) {
      return res.status(404).json({ error: "No rider locations available." });
    }

    return res.status(200).json({ riders });
  } catch (error) {
    console.error("❌ Error fetching rider locations:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
