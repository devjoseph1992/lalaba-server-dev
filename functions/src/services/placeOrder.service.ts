import * as admin from "firebase-admin";
import { createLinkedGcashPayment } from "../utils/createLinkedGcashPayment";
import { createBankOrCardPreorderPayment } from "../utils/createBankOrCardPreorderPayment";
import { calculateDistance } from "../utils/calculateDistance";
import { getMerchantDetails, MerchantDetails } from "./getMerchantDetails.service";
import { parseExtras } from "./parseExtras.service";

interface Location {
  latitude: number;
  longitude: number;
}

interface ExtraInput {
  id: string;
  quantity: number;
}

interface ServiceData {
  price: string | number;
  name?: string;
  inclusions?: string[];
}

interface PlaceOrderInput {
  userId: string;
  userData: { name?: string; email?: string };
  merchantId: string;
  serviceId: string;
  customerLocation: Location;
  customerAddress: string;
  extras?: ExtraInput[];
  estimatedKilo: number;
  orderType: "Delivery" | "Pick-up";
  paymentMethod: "GCash" | "Cash" | "Bank" | "Card";
  extraChoice?: "Add" | "Replace";
}

export async function placeOrder(input: PlaceOrderInput) {
  const {
    userId,
    userData,
    merchantId,
    serviceId,
    customerLocation,
    customerAddress,
    extras = [],
    estimatedKilo,
    orderType,
    paymentMethod,
    extraChoice,
  } = input;

  console.log(`📦 Starting order for user: ${userId}, payment: ${paymentMethod}`);

  const customerName = userData.name || "Unnamed Customer"; // ✅ Explicit customerName fallback

  const merchantDetails: MerchantDetails = await getMerchantDetails(merchantId);
  const serviceSnap = await admin
    .firestore()
    .collection("businesses")
    .doc(merchantId)
    .collection("services")
    .doc(serviceId)
    .get();

  if (!serviceSnap.exists) throw new Error("Service not found.");
  const serviceData = serviceSnap.data() as ServiceData;

  const pricePerKilo =
    typeof serviceData.price === "string" ? parseFloat(serviceData.price) : serviceData.price;
  const baseWashPrice = pricePerKilo * estimatedKilo;

  const { extraProducts, extrasTotal } = await parseExtras(merchantId, extras, estimatedKilo);

  const distance = calculateDistance(
    customerLocation.latitude,
    customerLocation.longitude,
    merchantDetails.coordinates.lat,
    merchantDetails.coordinates.lng
  );

  const baseFare = 39;
  const distanceFee = Math.ceil(distance / 5) * 30;
  const riderFee = baseFare + distanceFee;
  const riderPlatformFee = riderFee * 0.2;

  const totalAmount = parseFloat((baseWashPrice + extrasTotal + riderFee).toFixed(2));
  const orderRef = admin.firestore().collection("orders").doc();

  const orderBase = {
    orderId: orderRef.id,
    customerId: userId,
    customerName, // ✅ explicitly included
    merchantId,
    merchantLocation: merchantDetails.coordinates,
    merchantAddress: merchantDetails.address,
    merchantName: merchantDetails.businessName,
    serviceId,
    serviceName: serviceData.name ?? "Unnamed Service",
    inclusions: serviceData.inclusions ?? [],
    orderType,
    paymentMethod,
    estimatedKilo,
    price: parseFloat((baseWashPrice + extrasTotal).toFixed(2)),
    customerLocation,
    customerAddress,
    extras,
    extraProducts,
    extraChoice,
    distance: parseFloat(distance.toFixed(2)),
    riderFee,
    riderPlatformFee: parseFloat(riderPlatformFee.toFixed(2)),
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  const referenceId = `preorder-${orderRef.id}-${userId}`;
  const expiresAt = admin.firestore.Timestamp.fromDate(new Date(Date.now() + 15 * 60 * 1000));

  // ✅ GCash (tokenized)
  if (paymentMethod === "GCash") {
    const gcashSnap = await admin
      .firestore()
      .collection("payment_methods")
      .doc(userId)
      .collection("gcash")
      .where("status", "==", "ACTIVE")
      .orderBy("linkedAt", "desc")
      .limit(1)
      .get();

    if (gcashSnap.empty) throw new Error("No linked GCash payment method found.");
    const gcashData = gcashSnap.docs[0].data();
    if (!gcashData.tokenId) throw new Error("Missing GCash tokenId.");

    const { checkoutUrl, status } = await createLinkedGcashPayment({
      amount: totalAmount,
      customerId: userId,
      tokenId: gcashData.tokenId,
      referenceId,
    });

    const paymentStatus = status === "SUCCEEDED" ? "paid" : "pending";
    const orderStatus = status === "SUCCEEDED" ? "pending" : "awaiting_payment";

    await orderRef.set({
      ...orderBase,
      status: orderStatus,
      paymentStatus,
      referenceId,
      expiresAt,
      paidAt: status === "SUCCEEDED" ? admin.firestore.FieldValue.serverTimestamp() : null,
    });

    return {
      message: `GCash tokenized payment ${status.toLowerCase()}`,
      checkoutUrl,
      referenceId,
      orderId: orderRef.id,
      amount: totalAmount,
      riderFee,
      riderPlatformFee,
      merchantDetails,
    };
  }

  // 💳 Bank / Card
  if (paymentMethod === "Bank" || paymentMethod === "Card") {
    if (!userData.email) throw new Error("Customer email is required for Bank/Card.");

    const { checkoutUrl } = await createBankOrCardPreorderPayment({
      amount: totalAmount,
      customerId: userId,
      customerEmail: userData.email,
      referenceId,
    });

    await orderRef.set({
      ...orderBase,
      status: "awaiting_payment",
      paymentStatus: "pending",
      referenceId,
      expiresAt,
    });

    return {
      message: "Bank/Card checkout created successfully",
      checkoutUrl,
      referenceId,
      orderId: orderRef.id,
      amount: totalAmount,
      riderFee,
      riderPlatformFee,
      merchantDetails,
    };
  }

  // 💵 Cash
  await orderRef.set({
    ...orderBase,
    status: "pending",
    paymentStatus: "unpaid",
  });

  console.log(`📤 Cash order placed: ${orderRef.id}`);

  return {
    message: "Order placed successfully (Cash)",
    orderId: orderRef.id,
    price: orderBase.price,
    distance: `${distance.toFixed(2)} km`,
    riderFee,
    riderPlatformFee: orderBase.riderPlatformFee,
    merchantDetails,
  };
}
