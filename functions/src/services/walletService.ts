import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import axios from "axios";
import { encrypt, decrypt } from "../utils/encryption";

dotenv.config();

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_PAYMENT_URL = process.env.XENDIT_PAYMENT_URL;

if (!XENDIT_SECRET_KEY) {
  throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
}

if (!XENDIT_PAYMENT_URL) {
  throw new Error("❌ XENDIT_PAYMENT_URL is missing in environment variables.");
}

/**
 * ✅ Generate a Unique Wallet Account Number
 */
const generateWalletAccountNumber = async (): Promise<string> => {
  let isUnique = false;
  let accountNumber = "";

  while (!isUnique) {
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // Generate 10-digit number

    // Check if the account number already exists
    const snapshot = await admin
      .firestore()
      .collection("wallets")
      .where("accountNumber", "==", accountNumber)
      .get();

    if (snapshot.empty) {
      isUnique = true;
    }
  }

  return accountNumber;
};

/**
 * ✅ Initialize Wallet (Locks for 15 days on creation & Generates Account Number)
 */
export const createWallet = async (userId: string) => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      const lockUntil = new Date();
      lockUntil.setDate(lockUntil.getDate() + 15);

      // ✅ Generate a unique wallet account number
      const accountNumber = await generateWalletAccountNumber();

      await walletRef.set({
        userId,
        accountNumber, // ✅ Store wallet account number
        balance: encrypt("0"),
        nextWithdrawalDate: admin.firestore.Timestamp.fromDate(lockUntil),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(
        `✅ Wallet created for user ${userId} with account number ${accountNumber} & locked for 15 days`
      );

      return { userId, accountNumber, balance: 0 };
    } else {
      console.log(`ℹ️ Wallet already exists for user ${userId}`);
      return walletSnapshot.data();
    }
  } catch (error) {
    console.error("❌ Error creating wallet:", error);
    throw error;
  }
};

/**
 * ✅ Get Wallet Balance & Account Number
 */
export const getWalletBalance = async (userId: string) => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) throw new Error("❌ Wallet not found.");

    const walletData = walletSnapshot.data();
    return {
      accountNumber: walletData!.accountNumber, // ✅ Return account number
      balance: decrypt(walletData!.balance),
      nextWithdrawalDate: walletData!.nextWithdrawalDate.toDate(),
    };
  } catch (error) {
    console.error("❌ Error fetching wallet balance:", error);
    throw error;
  }
};

/**
 * ✅ Process Top-Up via Xendit
 */
export const topUpWallet = async (
  userId: string,
  amount: number,
  paymentMethod: "GCASH" | "BANK_TRANSFER" | "CREDIT_CARD"
) => {
  try {
    if (amount <= 0) throw new Error("❌ Invalid top-up amount.");

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();
    if (!walletSnapshot.exists) throw new Error("❌ Wallet not found.");

    const validMethods = ["GCASH", "BANK_TRANSFER", "CREDIT_CARD"];
    if (!validMethods.includes(paymentMethod)) {
      throw new Error("❌ Invalid payment method. Use GCASH, BANK_TRANSFER, or CREDIT_CARD.");
    }

    const referenceId = `ewallet-${Date.now()}-${userId}`;
    const channelCodeMapping: Record<string, string> = {
      GCASH: "GCASH",
      BANK_TRANSFER: "BPI",
      CREDIT_CARD: "CREDIT_CARD",
    };

    const requestBody = {
      reference_id: referenceId,
      currency: "PHP",
      amount,
      checkout_method: "ONE_TIME_PAYMENT",
      channel_code: channelCodeMapping[paymentMethod],
      channel_properties: {
        success_redirect_url: "https://yourdomain.com/success",
        failure_redirect_url: "https://yourdomain.com/failure",
      },
    };

    console.log("📌 Sending top-up request to Xendit:", requestBody);

    const response = await axios.post(
      XENDIT_PAYMENT_URL,
      requestBody,
      {
        auth: { username: XENDIT_SECRET_KEY, password: "" },
      }
    );

    console.log("✅ Xendit Top-Up Request Successful:", response.data);
    return {
      message: "Top-up request initiated. Await confirmation.",
      referenceId,
      checkoutUrl: response.data.checkout_url,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Error initiating top-up:", error.response?.data || error.message);
    } else {
      console.error("❌ Error initiating top-up:", error);
    }
    throw error;
  }
};

/**
 * ✅ Withdraw Funds (Minimum ₱500, Lock Wallet for 15 Days)
 */
export const withdrawFromWallet = async (userId: string, amount: number) => {
  try {
    if (amount < 500) throw new Error("❌ Minimum withdrawal amount is ₱500.");

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();
    if (!walletSnapshot.exists) throw new Error("❌ Wallet not found.");

    const walletData = walletSnapshot.data();
    const currentBalance = parseFloat(decrypt(walletData!.balance));
    const nextWithdrawalDate =
            walletData?.nextWithdrawalDate?.toDate() || new Date();

    if (currentBalance < amount) throw new Error("❌ Insufficient balance.");

    const today = new Date();
    if (today < nextWithdrawalDate) {
      throw new Error(
        `❌ Withdrawals are locked until ${nextWithdrawalDate.toLocaleDateString()}`
      );
    }

    const newBalance = currentBalance - amount;
    const lockUntil = new Date();
    lockUntil.setDate(lockUntil.getDate() + 15);

    await walletRef.update({
      balance: encrypt(newBalance.toString()),
      nextWithdrawalDate: admin.firestore.Timestamp.fromDate(lockUntil),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("wallet_transactions").add({
      userId,
      type: "withdrawal",
      amount,
      newBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `✅ Withdrawal successful for ${userId}, wallet locked for 15 days.`
    );
    return {
      message: "Withdrawal successful. Wallet locked for 15 days.",
      newBalance,
    };
  } catch (error) {
    console.error("❌ Error withdrawing from wallet:", error);
    throw error;
  }
};
