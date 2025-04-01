// routes/rider.ts
import { Router, Request, Response } from "express";
import admin from "firebase-admin";

const db = admin.database();
const router = Router();

router.post("/location", async (req: Request, res: Response) => {
  try {
    const { orderId, latitude, longitude } = req.body;
    if (!orderId || !latitude || !longitude) {
      return res.status(400).send("Missing fields");
    }

    await db.ref(`riderLocations/${orderId}`).set({
      latitude,
      longitude,
      timestamp: new Date().toISOString(),
    });

    return res.send("📍 Location updated");
  } catch (error) {
    console.error("❌ Error updating location:", error);
    return res.status(500).send("Internal server error");
  }
});

export default router;
