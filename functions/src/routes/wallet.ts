import { Router } from "express";
import * as admin from "firebase-admin";
import { decrypt } from "../utils/encryption";

const router = Router();

/**
 * ✅ Get Wallet Balance & Account Number
 */
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // ✅ Fetch Wallet Data
    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      console.error(`❌ Wallet not found for user: ${userId}`);
      return res.status(404).json({ error: "Wallet not found" });
    }

    const walletData = walletSnapshot.data();
    if (!walletData || !walletData.balance) {
      console.error(`❌ Wallet data missing for user: ${userId}`, walletData);
      return res.status(500).json({ error: "Wallet data is missing" });
    }

    console.log("✅ Wallet Data from Firestore:", walletData);

    // ✅ Debug Before Decrypting
    if (typeof walletData.balance !== "string") {
      console.error(`❌ Invalid balance format for user: ${userId}`, walletData.balance);
      return res.status(500).json({ error: "Invalid wallet balance format" });
    }

    // 🔹 Attempt to decrypt the balance
    let decryptedBalance;
    try {
      decryptedBalance = decrypt(walletData.balance);
    } catch (decryptError) {
      console.error(`❌ Error decrypting balance for user: ${userId}`, decryptError);
      return res.status(500).json({ error: "Error decrypting wallet balance" });
    }

    console.log(`✅ Decrypted Balance for ${userId}:`, decryptedBalance);

    return res.status(200).json({
      userId,
      accountNumber: walletData.accountNumber || "N/A",
      balance: parseFloat(decryptedBalance),
      currency: "PHP",
      updatedAt: walletData.updatedAt?.toDate() || null,
    });
  } catch (error) {
    console.error("❌ Error fetching wallet balance:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
