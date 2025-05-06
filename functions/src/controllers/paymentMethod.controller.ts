import { Request, Response } from "express";
import { firestore } from "firebase-admin";
import { encrypt } from "../utils/encryption";
import { isValidCardNumber, isValidExpiry, isValidCVC } from "../utils/validators"; // Make sure this file contains the validation logic below

export const savePaymentMethod = async (req: Request, res: Response) => {
  const {
    userId,
    gcashNumber,
    bank,
    creditCard,
  }: {
    userId: string;
    gcashNumber?: string;
    bank?: {
      bankName: string;
      accountName: string;
      accountNumber: string;
    };
    creditCard?: {
      cardNumber: string;
      cardHolder: string;
      expiry: string;
      cvc: string;
    };
  } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    // ✅ Validate GCash number
    let encryptedGcash = null;
    if (gcashNumber) {
      const cleaned = gcashNumber.replace(/\D/g, "");
      if (!/^\d{11}$/.test(cleaned)) {
        return res.status(400).json({
          error: "GCash number must be exactly 11 digits.",
        });
      }
      encryptedGcash = encrypt(cleaned);
    }

    // ✅ Validate and encrypt bank info
    let encryptedBank = null;
    if (bank) {
      const { bankName, accountName, accountNumber } = bank;

      if (!bankName || !accountName || !accountNumber) {
        return res.status(400).json({
          error: "Bank info is incomplete. Required: bankName, accountName, accountNumber.",
        });
      }

      if (!/^\d+$/.test(accountNumber)) {
        return res.status(400).json({
          error: "Bank account number must be numeric.",
        });
      }

      encryptedBank = {
        bankName,
        accountName,
        accountNumber: encrypt(accountNumber),
      };
    }

    // ✅ Validate and encrypt credit card
    let encryptedCard = null;
    if (creditCard) {
      const { cardNumber, cardHolder, expiry, cvc } = creditCard;

      if (!cardNumber || !cardHolder || !expiry || !cvc) {
        return res.status(400).json({
          error: "Credit card info is incomplete. Required: cardNumber, cardHolder, expiry, cvc.",
        });
      }

      if (!isValidCardNumber(cardNumber)) {
        return res.status(400).json({ error: "Invalid credit card number." });
      }

      if (!isValidExpiry(expiry)) {
        return res.status(400).json({
          error: "Invalid expiry format. Use MM/YY or MM/YYYY, and must be a future date.",
        });
      }

      if (!isValidCVC(cvc)) {
        return res.status(400).json({
          error: "Invalid CVC. Must be 3 or 4 digits.",
        });
      }

      encryptedCard = {
        cardNumber: encrypt(cardNumber),
        cardHolder,
        expiry: encrypt(expiry),
        cvc: encrypt(cvc),
      };
    }

    // ✅ Save to Firestore
    const docRef = await firestore().collection("payment_methods").add({
      userId,
      gcashNumber: encryptedGcash,
      bank: encryptedBank,
      creditCard: encryptedCard,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });

    return res.status(201).json({
      message: "Payment method saved successfully",
      id: docRef.id,
    });
  } catch (error: any) {
    console.error("❌ Error saving payment method:", error);
    return res.status(500).json({
      error: "Failed to save payment method",
      details: error.message,
    });
  }
};
