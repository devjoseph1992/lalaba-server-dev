import * as admin from "firebase-admin";

/**
 * ✅ Seeds default wash services: "Regular" and "Premium"
 * Called after a merchant is created
 */
export async function createDefaultServices(merchantId: string): Promise<void> {
  const db = admin.firestore();
  const servicesRef = db.collection("businesses").doc(merchantId).collection("services");

  const now = admin.firestore.FieldValue.serverTimestamp();

  const defaultServices = [
    {
      name: "Regular",
      type: "regular",
      price: 0, // Let merchant update
      inclusions: [],
      estimatedDurationMins: 120,
      available: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      name: "Premium",
      type: "premium",
      price: 0,
      inclusions: [],
      estimatedDurationMins: 180,
      available: false,
      createdAt: now,
      updatedAt: now,
    },
  ];

  for (const service of defaultServices) {
    const exists = await servicesRef.where("type", "==", service.type).limit(1).get();

    if (exists.empty) {
      await servicesRef.doc().set(service);
      console.log(`🧺 Created default service: ${service.name}`);
    } else {
      console.log(`✅ Service already exists: ${service.name}`);
    }
  }
}
