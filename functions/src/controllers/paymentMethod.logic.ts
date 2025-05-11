import { firestore } from "firebase-admin";
import { encrypt } from "../utils/encryption";
import { isValidCardNumber, isValidExpiry, isValidCVC } from "../utils/validators";

// ✅ GCash entry type
export type GcashEntry = {
  mobile_number?: string;
  addedAt?: Date;
  tokenId?: string;
  provider?: string;
  channel_code?: string;
  status?: string;
  linkedAt?: Date;
  updatedAt?: Date;
};

// ✅ Save GCash to subcollection
export const saveGcashPaymentMethod = async (userId: string, gcash: GcashEntry) => {
  const db = firestore();
  const now = new Date();

  const gcashRef = db.collection("payment_methods").doc(userId).collection("gcash");

  const gcashId =
    gcash.tokenId ||
    (gcash.mobile_number ? gcash.mobile_number.replace(/\D/g, "") : gcashRef.doc().id);

  await gcashRef.doc(gcashId).set(
    {
      ...gcash,
      updatedAt: now,
      addedAt: gcash.addedAt || now,
    },
    { merge: true }
  );
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
    cardNumber?: string; // optional for cases where full card is not provided
    cardLastFour: string;
    cardExpiry?: string;
    linkedAt?: Date;
  }
) => {
  const db = firestore();
  const now = new Date();

  const {
    tokenId,
    channelCode,
    status,
    accountEmail,
    accountMobileNumber,
    cardNumber,
    cardLastFour,
    cardExpiry,
    linkedAt,
  } = bank;

  const encryptedCardNumber = cardNumber ? encrypt(cardNumber) : null;

  const bankRef = db.collection("payment_methods").doc(userId).collection("bank");

  await bankRef.doc(tokenId).set(
    {
      tokenId,
      channelCode,
      status,
      accountEmail,
      accountMobileNumber,
      cardNumber: encryptedCardNumber,
      cardLastFour,
      cardExpiry: cardExpiry || null,
      linkedAt: linkedAt || now,
      addedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );

  console.log(`✅ Saved bank linking metadata for user ${userId}, token ${tokenId}`);
};

// ✅ Save Credit Card to subcollection
export const saveCreditCardPaymentMethod = async (
  userId: string,
  creditCard: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvc: string;
  }
) => {
  const db = firestore();
  const now = new Date();

  const { cardNumber, cardHolder, expiry, cvc } = creditCard;

  if (!cardNumber || !cardHolder || !expiry || !cvc) {
    throw new Error("Incomplete credit card info.");
  }

  if (!isValidCardNumber(cardNumber)) {
    throw new Error("Invalid credit card number.");
  }

  if (!isValidExpiry(expiry)) {
    throw new Error("Invalid expiry format.");
  }

  if (!isValidCVC(cvc)) {
    throw new Error("Invalid CVC.");
  }

  const encryptedCardNumber = encrypt(cardNumber);
  const encryptedExpiry = encrypt(expiry);
  const encryptedCvc = encrypt(cvc);

  const creditRef = db.collection("payment_methods").doc(userId).collection("creditcard");

  await creditRef.doc(encryptedCardNumber).set(
    {
      cardNumber: encryptedCardNumber,
      cardHolder,
      expiry: encryptedExpiry,
      cvc: encryptedCvc,
      addedAt: now,
      updatedAt: now,
    },
    { merge: true }
  );
};

// ✅ Unified entry point for saving
export const savePaymentMethodForUser = async ({
  userId,
  gcash,
  bank,
  creditCard,
}: {
  userId: string;
  gcash?: GcashEntry;
  bank?: {
    tokenId: string;
    channelCode: string;
    status: string;
    accountEmail: string;
    accountMobileNumber: string;
    cardNumber?: string; // Marked optional for flexibility
    cardLastFour: string;
    cardExpiry?: string;
    linkedAt?: Date;
  };
  creditCard?: {
    cardNumber: string;
    cardHolder: string;
    expiry: string;
    cvc: string;
  };
}) => {
  if (gcash) await saveGcashPaymentMethod(userId, gcash);

  if (bank) {
    await saveBankPaymentMethod(userId, {
      tokenId: bank.tokenId,
      channelCode: bank.channelCode,
      status: bank.status,
      accountEmail: bank.accountEmail,
      accountMobileNumber: bank.accountMobileNumber,
      cardNumber: bank.cardNumber, // ✅ Passed here now
      cardLastFour: bank.cardLastFour || "0000",
      cardExpiry: bank.cardExpiry,
      linkedAt: bank.linkedAt,
    });
  }

  if (creditCard) {
    await saveCreditCardPaymentMethod(userId, creditCard);
  }

  await firestore().collection("payment_methods").doc(userId).set(
    {
      updatedAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
};
