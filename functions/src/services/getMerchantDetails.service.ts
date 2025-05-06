import * as admin from "firebase-admin";

export interface MerchantDetails {
  merchantId: string;
  name?: string;
  role: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  address: string;
  businessName: string; // ✅ added
}

/**
 * Fetches and validates merchant details, including location and business info.
 * @param merchantId Firestore UID of the merchant
 * @returns MerchantDetails object
 * @throws Error if merchant is not valid or data is incomplete
 */
export async function getMerchantDetails(merchantId: string): Promise<MerchantDetails> {
  if (!merchantId) throw new Error("Missing merchantId");

  const userRef = admin.firestore().collection("users").doc(merchantId);
  const businessRef = admin
    .firestore()
    .collection("businesses")
    .doc(merchantId)
    .collection("info")
    .doc("details");

  const [userSnap, businessSnap] = await Promise.all([userRef.get(), businessRef.get()]);

  if (!userSnap.exists) throw new Error("Merchant not found.");
  const userData = userSnap.data();

  if (userData?.role !== "merchant") {
    throw new Error("Invalid merchant role.");
  }

  const businessData = businessSnap.data();

  if (!businessData || !businessData.coordinates?.lat || !businessData.coordinates?.lng) {
    throw new Error("Incomplete business details.");
  }

  const fullAddress = `${businessData.exactAddress ?? ""}${
    businessData.barangay ? ", Brgy. " + businessData.barangay : ""
  }${businessData.city ? ", " + businessData.city : ""}`;

  return {
    merchantId,
    name: userData.name || "Unnamed Merchant",
    role: userData.role,
    coordinates: {
      lat: businessData.coordinates.lat,
      lng: businessData.coordinates.lng,
    },
    address: fullAddress,
    businessName: businessData.businessName || "Unnamed Business", // ✅ now included
  };
}
