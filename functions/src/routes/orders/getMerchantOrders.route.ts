import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";

const router = Router();

/**
 * @route   GET /orders/merchant
 * @desc    Get all orders for the authenticated merchant's business
 * @access  Authenticated (Merchant)
 */
router.get("/merchant", async (req: CustomRequest, res: Response) => {
  try {
    let merchantId: string | undefined;
    let skipRoleCheck = false;

    // ✅ Emulator mode
    if (process.env.FUNCTIONS_EMULATOR === "true") {
      merchantId = "EwKCXybhIecGSfPZlecqTSCj80K2";
      skipRoleCheck = true;
      console.log("🧪 Emulator: Using mock merchantId →", merchantId);
    } else {
      // ✅ Production: verify token
      await verifyFirebaseToken(req, res, () => {});
      merchantId = req.user?.uid;

      if (!merchantId) {
        console.warn("❌ Missing merchant ID in token");
        return res.status(401).json({ error: "Unauthorized" });
      }

      console.log("🔐 Authenticated merchantId:", merchantId);
    }

    // ✅ Role check (skip in emulator)
    if (!skipRoleCheck) {
      const userSnap = await admin.firestore().collection("users").doc(merchantId).get();
      const userData = userSnap.data();

      if (!userSnap.exists || userData?.role !== "merchant") {
        console.warn("🚫 Not a merchant or user doesn't exist:", userData);
        return res.status(403).json({ error: "Forbidden: Only merchants can access this route." });
      }
    }

    // ✅ Build query
    let query = admin
      .firestore()
      .collection("orders")
      .where("merchantId", "==", merchantId)
      .where("status", "in", ["pending", "accepted_by_merchant"]);

    // Add sorting if not using emulator (to avoid index issues)
    if (process.env.FUNCTIONS_EMULATOR !== "true") {
      query = query.orderBy("createdAt", "desc");
    }

    const ordersSnap = await query.get();

    console.log(`📊 Orders found for merchant ${merchantId}: ${ordersSnap.size}`);

    if (ordersSnap.empty) {
      return res.status(404).json({ error: "Order not found." });
    }

    const orders = ordersSnap.docs.map((doc) => {
      const data = doc.data();
      return {
        orderId: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
      };
    });

    return res.status(200).json({ orders });
  } catch (error: any) {
    console.error("❌ Error fetching merchant orders:", error.message);
    console.error("📛 Stack:", error.stack);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
