import { firestore } from "firebase-admin";
import { encrypt } from "../utils/encryption";

// ✅ GCash entry type
export type GcashEntry = {
  mobile_number?: string | null;
  addedAt?: Date;
  tokenId?: string;
  provider?: string;
  channel_code?: string;
  status?: string;
  linkedAt?: Date;
  updatedAt?: Date;
};

// 🔧 Remove null/undefined before saving to Firestore
function cleanFirestoreData<T extends object>(data: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined && v !== null)
  ) as Partial<T>;
}

// ✅ Save GCash to subcollection
export const saveGcashPaymentMethod = async (userId: string, gcash: GcashEntry) => {
  const db = firestore();
  const now = new Date();

  const gcashRef = db.collection("payment_methods").doc(userId).collection("gcash");
  const gcashId = gcash.tokenId || gcashRef.doc().id;

  const cleanData = cleanFirestoreData({
    ...gcash,
    addedAt: gcash.addedAt || now,
    updatedAt: now,
  });

  await gcashRef.doc(gcashId).set(cleanData, { merge: true });
};

// ✅ Save Bank to subcollection
export const saveBankPaymentMethod = async (
  userId: string,
  bank: {
    tokenId: string;
    channelCode: string;
    status: string;
    accountEmail: string;
    accountMobileNumber: string;
    cardNumber?: string;
    cardLastFour: string;
    cardExpiry?: string;
    linkedAt?: Date;
  }
) => {
  const db = firestore();
  const now = new Date();

  const encryptedCardNumber = bank.cardNumber ? encrypt(bank.cardNumber) : undefined;

  const bankRef = db.collection("payment_methods").doc(userId).collection("bank");

  const cleanData = cleanFirestoreData({
    tokenId: bank.tokenId,
    channelCode: bank.channelCode,
    status: bank.status,
    accountEmail: bank.accountEmail,
    accountMobileNumber: bank.accountMobileNumber,
    cardNumber: encryptedCardNumber,
    cardLastFour: bank.cardLastFour,
    cardExpiry: bank.cardExpiry || null,
    linkedAt: bank.linkedAt || now,
    addedAt: now,
    updatedAt: now,
  });

  await bankRef.doc(bank.tokenId).set(cleanData, { merge: true });

  console.log(`✅ Saved bank linking metadata for user ${userId}, token ${bank.tokenId}`);
};

// ✅ Unified save function
export const savePaymentMethodForUser = async ({
  userId,
  gcash,
  bank,
}: {
  userId: string;
  gcash?: GcashEntry;
  bank?: {
    tokenId: string;
    channelCode: string;
    status: string;
    accountEmail: string;
    accountMobileNumber: string;
    cardNumber?: string;
    cardLastFour: string;
    cardExpiry?: string;
    linkedAt?: Date;
  };
}) => {
  if (gcash) {
    await saveGcashPaymentMethod(userId, gcash);
  }

  if (bank) {
    await saveBankPaymentMethod(userId, bank);
  }

  await firestore().collection("payment_methods").doc(userId).set(
    {
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};
