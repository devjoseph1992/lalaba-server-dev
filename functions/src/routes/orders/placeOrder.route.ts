import { Request, Response, Router } from "express";
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
}

interface PlaceOrderRequestBody {
  merchantId: string;
  serviceId: string;
  customerLocation: Location;
  customerAddress: string;
  extras?: ExtraInput[];
  estimatedKilo: number;
  orderType: "Delivery" | "Pick-up";
}

router.post(
  "/place",
  verifyFirebaseToken,
  hasBalance,
  async (req: Request<{}, {}, PlaceOrderRequestBody> & CustomRequest, res: Response) => {
    try {
      const {
        merchantId,
        serviceId,
        customerLocation,
        customerAddress,
        extras = [], // ✅ fallback for optional
        estimatedKilo,
        orderType,
      } = req.body;

      const userId = req.user?.uid;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      // 🔐 Check customer role
      const userSnap = await admin.firestore().collection("users").doc(userId).get();
      const userData = userSnap.data() as UserData | undefined;

      if (!userData || userData.role !== "customer") {
        return res.status(403).json({ error: "Only customers can place orders." });
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
        !["Delivery", "Pick-up"].includes(orderType)
      ) {
        return res.status(400).json({ error: "Missing or invalid required fields." });
      }

      // 📍 Get merchant details
      const detailsRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("info")
        .doc("details");

      const detailsSnap = await detailsRef.get();
      const detailsData = detailsSnap.data();

      if (!detailsData || !detailsData.coordinates?.lat || !detailsData.coordinates?.lng) {
        return res.status(400).json({ error: "Merchant location is missing." });
      }

      const merchantLocation = {
        latitude: detailsData.coordinates.lat,
        longitude: detailsData.coordinates.lng,
      };

      const { exactAddress = "", barangay = "", city = "" } = detailsData;

      const merchantAddress = `${exactAddress}${barangay ? ", Brgy. " + barangay : ""}${city ? ", " + city : ""}`;

      // 💰 Fetch service
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

      const serviceName = serviceData.name || "Unnamed Service";
      const inclusions = serviceData.inclusions || [];

      // 🎁 Fetch extra products with quantity
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
          const input: ExtraInput = extras[index];

          try {
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

            if (isNaN(price)) {
              throw new Error(`Invalid price for product ${input.id}`);
            }

            return {
              id: input.id,
              name: data.name || "Unnamed Extra",
              price,
              quantity: input.quantity || 1,
            };
          } catch (err) {
            console.error("❌ Failed to process extra product:", err);
            throw err;
          }
        });
      }

      // 📏 Calculate distance & fees
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

      // 📝 Prepare order
      const orderRef = admin.firestore().collection("orders").doc();
      const orderData = {
        orderId: orderRef.id,
        customerId: userId,
        merchantId,
        merchantLocation,
        merchantAddress,
        serviceId,
        serviceName,
        inclusions,
        orderType,
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

      console.log("📝 Final Order Data to Save:", JSON.stringify(orderData, null, 2));

      await orderRef.set(orderData);

      return res.status(201).json({
        message: "Order placed successfully.",
        orderId: orderRef.id,
        price: parseFloat(basePrice.toFixed(2)),
        distance: `${distance.toFixed(2)} km`,
        riderFee,
        riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
      });
    } catch (err: any) {
      console.error("❌ Error placing order:", err.message);
      console.error("📛 Full Stack Trace:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
