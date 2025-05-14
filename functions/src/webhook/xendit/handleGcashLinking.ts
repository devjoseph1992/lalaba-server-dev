import * as admin from "firebase-admin";
import { Response } from "express";
import { saveGcashPaymentMethod } from "../../controllers/paymentMethod.logic";

export const handleGcashLinking = async (
  event: string,
  data: any,
  res: Response
): Promise<Response> => {
  if (event !== "payment_method.activated" || data?.status !== "ACTIVE") {
    return res.status(200).send("GCash linking event ignored");
  }

  const customerId = data.customer_id;
  const tokenId = data.id;

  const userQuery = await admin
    .firestore()
    .collection("users")
    .where("xenditCustomerId", "==", customerId)
    .limit(1)
    .get();

  if (userQuery.empty) {
    console.warn("❌ No user for customerId:", customerId);
    return res.status(200).send("No user match for GCash linking");
  }

  const userId = userQuery.docs[0].id;

  const gcashDocs = await admin
    .firestore()
    .collection("payment_methods")
    .doc(userId)
    .collection("gcash")
    .get();

  let matchedMobile: string | undefined;
  gcashDocs.forEach((doc) => {
    const d = doc.data();
    if (!d.tokenId && d.mobile_number) {
      matchedMobile = d.mobile_number;
    }
  });

  await saveGcashPaymentMethod(userId, {
    tokenId,
    provider: "GCASH",
    channel_code: data.ewallet?.channel_code || "GCASH",
    status: data.status,
    linkedAt: new Date(),
    updatedAt: new Date(),
    mobile_number: matchedMobile,
  });

  console.log(`✅ GCash method saved for ${userId}`);
  return res.status(200).send("GCash payment method saved");
};
