import { Response, Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

router.get("/customer", verifyFirebaseToken, async (req: CustomRequest, res: Response) => {
  try {
    const customerId = req.user?.uid;
    console.log("🧑‍💼 Authenticated customer ID:", customerId);

    if (!customerId) {
      console.warn("⚠️ No customer ID found in token");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const query = admin
      .firestore()
      .collection("orders")
      .where("customerId", "==", customerId)
      .orderBy("createdAt", "desc");

    console.log("🔎 Running Firestore query for customer orders...");

    const snapshot = await query.get();

    console.log(`✅ Query returned ${snapshot.size} order(s)`);

    if (snapshot.empty) {
      console.log("📭 No orders found for this customer.");
    }

    const orders = snapshot.docs.map((doc, i) => {
      const data = doc.data();
      console.log(`📦 Order #${i + 1}:`, {
        orderId: doc.id,
        createdAt: data.createdAt,
        status: data.status,
      });

      return {
        orderId: doc.id,
        ...data,
      };
    });

    return res.status(200).json({ orders });
  } catch (error: any) {
    console.error("❌ Error in /orders/customer:", error.message);
    console.error("📛 Stack Trace:", error.stack);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
