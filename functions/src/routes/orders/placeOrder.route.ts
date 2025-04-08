import { Router, Response, Request } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { hasBalance } from "../../middleware/hasBalance";
import { calculateDistance } from "../../utils/calculateDistance";
import { CustomRequest } from "../../types/global";

const router = Router();

// Types
interface Location {
  latitude: number;
  longitude: number;
}

interface ServiceData {
  price: string | number;
}

interface UserData {
  role?: string;
}

interface PlaceOrderRequestBody {
  merchantId: string;
  washType: string;
  customerLocation: Location;
  extras?: string[];
  estimatedKilo: number;
}

// Route
router.post(
  "/order/place",
  verifyFirebaseToken,
  hasBalance,
  async (req: Request<{}, {}, PlaceOrderRequestBody> & CustomRequest, res: Response) => {
    try {
      const { merchantId, washType, customerLocation, extras, estimatedKilo } = req.body;

      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // Check if user is a customer
      const userSnap = await admin.firestore().collection("users").doc(userId).get();
      const userData = userSnap.data() as UserData | undefined;

      if (!userData || userData.role !== "customer") {
        return res.status(403).json({ error: "Only customers can place orders." });
      }

      if (
        !merchantId ||
        !washType ||
        !customerLocation?.latitude ||
        !customerLocation?.longitude ||
        typeof estimatedKilo !== "number"
      ) {
        return res.status(400).json({ error: "Missing or invalid required fields." });
      }

      // Get merchant location
      const merchantSnap = await admin.firestore().collection("users").doc(merchantId).get();
      const merchantData = merchantSnap.data();
      const merchantLocation = merchantData?.location as Location | undefined;

      if (!merchantLocation?.latitude || !merchantLocation?.longitude) {
        return res.status(400).json({ error: "Merchant location is missing." });
      }

      // Fetch washType pricing
      const servicesSnap = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("services")
        .where("name", "==", washType)
        .limit(1)
        .get();

      if (servicesSnap.empty) {
        return res.status(404).json({ error: "Wash type not found for this merchant." });
      }

      const serviceData = servicesSnap.docs[0].data() as ServiceData;
      const washTypePrice =
        typeof serviceData.price === "string" ? parseFloat(serviceData.price) : serviceData.price;

      if (!washTypePrice || washTypePrice <= 0) {
        return res.status(400).json({ error: "Invalid wash type price." });
      }

      const price = washTypePrice * estimatedKilo;

      // Calculate distance and rider fee
      const distance = calculateDistance(
        customerLocation.latitude,
        customerLocation.longitude,
        merchantLocation.latitude,
        merchantLocation.longitude
      );

      const baseFare = 49;
      const distanceFee = Math.ceil(distance / 5) * 30;
      const riderFee = baseFare + distanceFee;
      const riderPlatformFee = riderFee * 0.2;

      // Create order
      const orderRef = admin.firestore().collection("orders").doc();
      const orderData = {
        orderId: orderRef.id,
        userId,
        merchantId,
        washType,
        estimatedKilo,
        price: parseFloat(price.toFixed(2)),
        status: "pending",
        customerLocation,
        merchantLocation,
        extras: extras || null,
        distance: parseFloat(distance.toFixed(2)),
        riderFee,
        riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await orderRef.set(orderData);

      return res.status(201).json({
        message: "Order placed successfully.",
        orderId: orderRef.id,
        price: parseFloat(price.toFixed(2)),
        distance: `${distance.toFixed(2)} km`,
        riderFee,
        riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
      });
    } catch (err) {
      console.error("❌ Error placing order:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
