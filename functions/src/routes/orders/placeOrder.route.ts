import { Request, Response, Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { placeOrder } from "../../services/placeOrder.service";

const router = Router();

interface Location {
  latitude: number;
  longitude: number;
}

interface ExtraInput {
  id: string;
  quantity: number;
}

interface PlaceOrderRequestBody {
  merchantId: string;
  serviceId: string;
  customerLocation: Location;
  customerAddress: string;
  extras?: ExtraInput[];
  estimatedKilo: number;
  orderType: "Delivery" | "Pick-up";
  paymentMethod: "GCash" | "Cash" | "Bank";
  extraChoice?: "Add" | "Replace";
}

router.post(
  "/place",
  verifyFirebaseToken,
  async (req: Request<{}, {}, PlaceOrderRequestBody> & CustomRequest, res: Response) => {
    try {
      const {
        merchantId,
        serviceId,
        customerLocation,
        customerAddress,
        extras = [],
        estimatedKilo,
        orderType,
        paymentMethod,
        extraChoice,
      } = req.body;

      const userId = req.user?.uid;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // 🧑‍💼 Fetch & validate user
      const userSnap = await admin.firestore().collection("users").doc(userId).get();
      const userData = userSnap.data();

      if (!userData || userData.role !== "customer") {
        return res.status(403).json({ error: "Only customers can place orders." });
      }

      // 🚀 Call order service
      const result = await placeOrder({
        userId,
        userData,
        merchantId,
        serviceId,
        customerLocation,
        customerAddress,
        extras,
        estimatedKilo,
        orderType,
        paymentMethod,
        extraChoice,
      });

      return res.status(201).json(result);
    } catch (err: any) {
      console.error("❌ Error placing order:", err.message || err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
