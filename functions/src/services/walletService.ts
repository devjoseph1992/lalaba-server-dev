import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import axios from "axios";
import { decrypt, encrypt } from "../utils/encryption";

dotenv.config();

const XENDIT_SECRET_KEY = process.env.XENDIT_SECRET_KEY;
const XENDIT_PAYMENT_URL = process.env.XENDIT_PAYMENT_URL;

if (!XENDIT_SECRET_KEY) {
  throw new Error("❌ XENDIT_SECRET_KEY is missing in environment variables.");
}

if (!XENDIT_PAYMENT_URL) {
  throw new Error("❌ XENDIT_PAYMENT_URL is missing in environment variables.");
}

// =====================================================
// WALLET CORE LOGIC
// =====================================================

const generateWalletAccountNumber = async (): Promise<string> => {
  let isUnique = false;
  let accountNumber = "";

  while (!isUnique) {
    accountNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString(); // 10-digit number

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

export const createWallet = async (userId: string) => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      const lockUntil = new Date();
      lockUntil.setDate(lockUntil.getDate() + 15);

      const accountNumber = await generateWalletAccountNumber();

      await walletRef.set({
        userId,
        accountNumber,
        balance: encrypt("0"),
        holdAmount: encrypt("0"), // ✅ added
        holdUntil: null, // ✅ added
        nextWithdrawalDate: admin.firestore.Timestamp.fromDate(lockUntil),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Wallet created for user ${userId}`);
      return { userId, accountNumber, balance: 0 };
    } else {
      return walletSnapshot.data();
    }
  } catch (error) {
    console.error("❌ Error creating wallet:", error);
    throw error;
  }
};

export const getWalletBalance = async (userId: string) => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) throw new Error("❌ Wallet not found.");

    const walletData = walletSnapshot.data();
    return {
      accountNumber: walletData!.accountNumber,
      balance: parseFloat(decrypt(walletData!.balance)),
      holdAmount: walletData?.holdAmount ? parseFloat(decrypt(walletData.holdAmount)) : 0,
      holdUntil: walletData?.holdUntil?.toDate() || null,
      nextWithdrawalDate: walletData!.nextWithdrawalDate.toDate(),
    };
  } catch (error) {
    console.error("❌ Error fetching wallet balance:", error);
    throw error;
  }
};

// =====================================================
// TOP-UP
// =====================================================

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

    const response = await axios.post(XENDIT_PAYMENT_URL, requestBody, {
      auth: { username: XENDIT_SECRET_KEY, password: "" },
    });

    return {
      message: "Top-up request initiated.",
      referenceId,
      checkoutUrl: response.data.checkout_url,
    };
  } catch (error) {
    console.error("❌ Error initiating top-up:", error);
    throw error;
  }
};

// =====================================================
// WITHDRAW
// =====================================================

export const withdrawFromWallet = async (userId: string, amount: number) => {
  try {
    if (amount < 500) throw new Error("❌ Minimum withdrawal is ₱500.");

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();
    if (!walletSnapshot.exists) throw new Error("❌ Wallet not found.");

    const walletData = walletSnapshot.data();
    const currentBalance = parseFloat(decrypt(walletData!.balance));
    const holdAmount = walletData?.holdAmount ? parseFloat(decrypt(walletData.holdAmount)) : 0;

    const availableBalance = currentBalance - holdAmount;
    const nextWithdrawalDate = walletData?.nextWithdrawalDate?.toDate() || new Date();

    if (availableBalance < amount) throw new Error("❌ Insufficient available balance.");

    if (new Date() < nextWithdrawalDate) {
      throw new Error(`❌ Withdrawals are locked until ${nextWithdrawalDate.toLocaleDateString()}`);
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

    return {
      message: "Withdrawal successful. Wallet locked for 15 days.",
      newBalance,
    };
  } catch (error) {
    console.error("❌ Error withdrawing from wallet:", error);
    throw error;
  }
};

// =====================================================
// PLATFORM FEE: HOLD / COLLECT / RELEASE
// =====================================================

/**
 * ✅ Deduct and Hold Platform Fee
 */
export const deductAndHold = async (
  userId: string,
  feeAmount: number,
  role: "merchant" | "rider",
  holdMinutes = 30
): Promise<{
  newBalance: number;
  heldAmount: number;
  holdUntil: Date;
}> => {
  try {
    if (feeAmount <= 0) {
      throw new Error("❌ Platform fee must be greater than zero.");
    }

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();
    if (!walletSnap.exists) throw new Error(`❌ Wallet not found for ${role}: ${userId}`);

    const walletData = walletSnap.data();
    const balance = parseFloat(decrypt(walletData!.balance));

    if (balance < feeAmount) {
      throw new Error(`❌ ${role} has insufficient balance to cover platform fee.`);
    }

    const newBalance = balance - feeAmount;
    const holdUntil = new Date(Date.now() + holdMinutes * 60 * 1000);

    await walletRef.update({
      balance: encrypt(newBalance.toString()),
      holdAmount: encrypt(feeAmount.toString()),
      holdUntil: admin.firestore.Timestamp.fromDate(holdUntil),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("wallet_transactions").add({
      userId,
      type: "platform_fee_hold",
      role,
      amount: feeAmount,
      newBalance,
      holdUntil,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      newBalance,
      heldAmount: feeAmount,
      holdUntil,
    };
  } catch (error) {
    console.error(`❌ Error holding platform fee for ${role}:`, error);
    throw error;
  }
};

/**
 * ✅ Release Platform Fee Hold
 */
export const releaseHold = async (
  userId: string
): Promise<{ newBalance: number; releasedAmount: number }> => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) throw new Error(`❌ Wallet not found for user: ${userId}`);

    const walletData = walletSnap.data();
    const balance = parseFloat(decrypt(walletData!.balance));
    const holdAmount = walletData?.holdAmount ? parseFloat(decrypt(walletData.holdAmount)) : 0;

    if (holdAmount <= 0) {
      return { newBalance: balance, releasedAmount: 0 };
    }

    const updatedBalance = balance + holdAmount;

    await walletRef.update({
      balance: encrypt(updatedBalance.toString()),
      holdAmount: encrypt("0"),
      holdUntil: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("wallet_transactions").add({
      userId,
      type: "platform_fee_refund",
      amount: holdAmount,
      newBalance: updatedBalance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      newBalance: updatedBalance,
      releasedAmount: holdAmount,
    };
  } catch (error) {
    console.error("❌ Error releasing platform fee hold:", error);
    throw error;
  }
};

/**
 * ✅ Collect Held Platform Fee (Called when order is completed)
 */
export const collectHeldAmount = async (
  userId: string,
  role: "merchant" | "rider"
): Promise<{
  collectedAmount: number;
}> => {
  try {
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) throw new Error(`❌ Wallet not found for ${role}: ${userId}`);

    const walletData = walletSnap.data();
    const heldAmount = walletData?.holdAmount ? parseFloat(decrypt(walletData.holdAmount)) : 0;

    if (heldAmount <= 0) {
      return { collectedAmount: 0 };
    }

    await walletRef.update({
      holdAmount: encrypt("0"),
      holdUntil: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection("wallet_transactions").add({
      userId,
      type: "platform_fee_collected",
      role,
      amount: heldAmount,
      collectedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      collectedAmount: heldAmount,
    };
  } catch (error) {
    console.error(`❌ Error collecting platform fee for ${role}:`, error);
    throw error;
  }
};
