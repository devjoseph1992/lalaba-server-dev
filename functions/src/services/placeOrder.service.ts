import * as admin from "firebase-admin";
import { decrypt } from "../utils/encryption";
import { createGcashPreorderPayment } from "../utils/gcashPreorder";
import { createBankOrCardPreorderPayment } from "../utils/createBankOrCardPreorderPayment"; // ✅ import added
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
  paymentMethod: "GCash" | "Cash" | "Bank" | "Card"; // ✅ extended
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

  const merchantDetails: MerchantDetails = await getMerchantDetails(merchantId);
  console.log(`🏪 Merchant: ${merchantDetails.businessName}`);

  const serviceSnap = await admin
    .firestore()
    .collection("businesses")
    .doc(merchantId)
    .collection("services")
    .doc(serviceId)
    .get();

  if (!serviceSnap.exists) {
    throw new Error("Service not found.");
  }

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
    customerName: userData.name || "Unnamed Customer",
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

  if (paymentMethod === "GCash") {
    const pmSnap = await admin
      .firestore()
      .collection("payment_methods")
      .where("userId", "==", userId)
      .limit(1)
      .get();

    if (pmSnap.empty) throw new Error("No GCash number saved.");
    const gcashData = pmSnap.docs[0].data();
    if (!gcashData.gcashNumber) throw new Error("GCash number is required.");

    const customerPhone = decrypt(gcashData.gcashNumber);

    const { checkoutUrl } = await createGcashPreorderPayment({
      amount: totalAmount,
      customerId: userId,
      customerPhone,
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
      message: "GCash checkout created successfully",
      checkoutUrl,
      referenceId,
      orderId: orderRef.id,
      amount: totalAmount,
      riderFee,
      riderPlatformFee,
      merchantDetails,
    };
  }

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

  // Fallback: Cash
  const cashOrder = {
    ...orderBase,
    status: "pending",
    paymentStatus: "unpaid",
  };

  await orderRef.set(cashOrder);
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
