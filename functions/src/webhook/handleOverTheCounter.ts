import { Response } from "express";
import * as admin from "firebase-admin";
import { decrypt, encrypt } from "../utils/encryption";

export const handleOverTheCounter = async (webhookData: any, res: Response) => {
  try {
    const data = webhookData?.data;
    const { reference_id, charge_amount, id: chargeId, channel_code, status } = data;

    if (!reference_id || !charge_amount || !chargeId) {
      console.error("❌ Missing required OTC fields");
      return res.status(400).json({ error: "Missing required fields." });
    }

    console.log("🏪 OTC Top-Up webhook received");
    console.log(`🔍 reference_id: ${reference_id}`);
    console.log(`💵 Amount: ₱${charge_amount}, Channel: ${channel_code}, Status: ${status}`);

    // ✅ Expecting format: "topup-<userId>"
    const parts = reference_id.split("-");
    if (parts.length !== 2 || parts[0] !== "topup") {
      console.warn("❌ Invalid reference_id format:", reference_id);
      return res.status(400).json({ error: "Invalid top-up reference ID format." });
    }

    const userId = parts[1];

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnap = await walletRef.get();

    if (!walletSnap.exists) {
      console.error("❌ Wallet not found for user:", userId);
      return res.status(404).json({ error: "Wallet not found." });
    }

    const walletData = walletSnap.data();
    const oldBalance = parseFloat(decrypt(walletData?.balance || "0"));
    const newBalance = oldBalance + charge_amount;

    console.log(`💰 Crediting full ₱${charge_amount} to user ${userId} (no platform fee)`);

    await admin.firestore().runTransaction(async (t) => {
      // 💳 Update wallet
      t.update(walletRef, {
        balance: encrypt(newBalance.toFixed(2)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 🧾 Log top-up
      const logRef = admin.firestore().collection("wallet_logs").doc();
      t.set(logRef, {
        userId,
        type: "topup",
        method: "Over-the-Counter",
        amount: charge_amount,
        platformFee: 0,
        channel: channel_code,
        xenditChargeId: chargeId,
        referenceId: reference_id,
        status,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Wallet top-up successful for user ${userId}`);
    return res.status(200).json({ message: "Wallet top-up credited in full." });
  } catch (error: any) {
    console.error("❌ OTC Top-Up Handler Error:", error.message || error);
    return res.status(500).json({ error: "OTC top-up handler failed." });
  }
};
