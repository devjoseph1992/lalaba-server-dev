import { Request, Response, Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../../middleware/auth";
import { calculateDistance } from "../../utils/calculateDistance";
import { CustomRequest } from "../../types/global";

const router = Router();

interface Location {
  latitude: number;
  longitude: number;
}

interface ServiceData {
  price: string | number;
  name?: string;
  inclusions?: string[];
}

interface ProductData {
  name: string;
  price: number | string;
}

interface ExtraInput {
  id: string;
  quantity: number;
}

interface UserData {
  role?: string;
  name?: string; // ✅ Get customer name
}

interface PlaceOrderRequestBody {
  merchantId: string;
  serviceId: string;
  customerLocation: Location;
  customerAddress: string;
  extras?: ExtraInput[];
  estimatedKilo: number;
  orderType: "Delivery" | "Pick-up";
  paymentMethod: "GCash" | "Cash"; // ✅ Add payment method
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
      } = req.body;

      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // 🔐 Validate customer
      const userSnap = await admin.firestore().collection("users").doc(userId).get();
      const userData = userSnap.data() as UserData;

      if (!userData || userData.role !== "customer") {
        return res.status(403).json({ error: "Only customers can place orders." });
      }

      const customerName = userData.name || "Unnamed Customer"; // ✅

      // 🧼 Check for existing pending order
      const existingPendingOrder = await admin
        .firestore()
        .collection("orders")
        .where("customerId", "==", userId)
        .where("status", "==", "pending")
        .limit(1)
        .get();

      if (!existingPendingOrder.empty) {
        return res.status(400).json({
          error: "You already have a pending order. Please complete or cancel it first.",
        });
      }

      // 🔐 Merchant check
      const merchantSnap = await admin.firestore().collection("users").doc(merchantId).get();
      const merchantData = merchantSnap.data() as UserData;

      if (!merchantSnap.exists || merchantData?.role !== "merchant") {
        return res.status(400).json({ error: "Invalid merchantId." });
      }

      // ✅ Validate fields
      if (
        !merchantId ||
        !serviceId ||
        !customerLocation?.latitude ||
        !customerLocation?.longitude ||
        typeof estimatedKilo !== "number" ||
        !customerAddress ||
        !orderType ||
        !["Delivery", "Pick-up"].includes(orderType) ||
        !paymentMethod ||
        !["GCash", "Cash"].includes(paymentMethod)
      ) {
        return res.status(400).json({ error: "Missing or invalid required fields." });
      }

      // 📍 Get merchant coordinates
      const detailsRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("info")
        .doc("details");

      const detailsSnap = await detailsRef.get();
      const detailsData = detailsSnap.data();

      if (!detailsData?.coordinates?.lat || !detailsData?.coordinates?.lng) {
        return res.status(400).json({ error: "Merchant location is missing." });
      }

      const merchantLocation = {
        latitude: detailsData.coordinates.lat,
        longitude: detailsData.coordinates.lng,
      };

      const merchantAddress = `${detailsData.exactAddress ?? ""}${
        detailsData.barangay ? ", Brgy. " + detailsData.barangay : ""
      }${detailsData.city ? ", " + detailsData.city : ""}`;

      // 💰 Fetch service data
      const serviceDoc = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("services")
        .doc(serviceId)
        .get();

      if (!serviceDoc.exists) {
        return res.status(404).json({ error: "Service not found." });
      }

      const serviceData = serviceDoc.data() as ServiceData;
      const pricePerKilo =
        typeof serviceData.price === "string" ? parseFloat(serviceData.price) : serviceData.price;

      if (!pricePerKilo || pricePerKilo <= 0) {
        return res.status(400).json({ error: "Invalid service price." });
      }

      const basePrice = pricePerKilo * estimatedKilo;
      const serviceName = serviceData.name ?? "Unnamed Service";
      const inclusions = serviceData.inclusions ?? [];

      // 🎁 Extras
      let extraProducts: { id: string; name: string; price: number; quantity: number }[] = [];

      if (extras.length > 0) {
        const extrasSnapshot = await Promise.all(
          extras.map((extra: ExtraInput) =>
            admin
              .firestore()
              .collection("businesses")
              .doc(merchantId)
              .collection("products")
              .doc(extra.id)
              .get()
          )
        );

        extraProducts = extrasSnapshot.map((snap, index) => {
          const input = extras[index];
          if (!snap.exists) {
            console.warn(`⚠️ Product not found: ${input.id}`);
            return {
              id: input.id,
              name: "Unknown Extra",
              price: 0,
              quantity: input.quantity || 1,
            };
          }

          const data = snap.data() as ProductData;
          const price = typeof data.price === "string" ? parseFloat(data.price) : data.price;

          if (isNaN(price)) throw new Error(`Invalid price for product ${input.id}`);

          return {
            id: input.id,
            name: data.name ?? "Unnamed Extra",
            price,
            quantity: input.quantity || 1,
          };
        });
      }

      // 🚗 Calculate distance and rider fee
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

      // 📝 Create order
      const orderRef = admin.firestore().collection("orders").doc();
      const orderData = {
        orderId: orderRef.id,
        customerId: userId,
        customerName, // ✅
        merchantId,
        merchantLocation,
        merchantAddress,
        serviceId,
        serviceName,
        inclusions,
        orderType,
        paymentMethod, // ✅
        estimatedKilo,
        price: parseFloat(basePrice.toFixed(2)),
        customerLocation,
        customerAddress,
        extras,
        extraProducts,
        distance: parseFloat(distance.toFixed(2)),
        riderFee,
        riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await orderRef.set(orderData);

      return res.status(201).json({
        message: "Order placed successfully.",
        orderId: orderRef.id,
        price: orderData.price,
        distance: `${distance.toFixed(2)} km`,
        riderFee,
        riderPlatformFee: orderData.riderPlatformFee,
      });
    } catch (err: any) {
      console.error("❌ Error placing order:", err.message);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
