import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { decrypt, encrypt } from "../utils/encryption";

export const handleBank = async (req: Request, res: Response) => {
  try {
    const data = req.body.data;
    const { reference_id, charge_amount, id: chargeId, channel_code, status } = data;

    if (!reference_id || !charge_amount || !chargeId) {
      console.error("❌ Missing required bank transfer fields");
      return res.status(400).json({ error: "Missing required fields." });
    }

    console.log(`🏦 Bank webhook received`);
    console.log(
      `🔍 reference_id: ${reference_id}, chargeId: ${chargeId}, channel: ${channel_code}, amount: ₱${charge_amount}, status: ${status}`
    );

    let orderId = "";
    let userId = "";

    // 🧠 Expected format: "order-<orderId>-cust-<userId>"
    const parts = reference_id.split("-");
    if (parts.length >= 4 && parts[0] === "order" && parts[2] === "cust") {
      orderId = parts[1];
      userId = parts[3];
    } else {
      console.warn("❌ Invalid reference_id format:", reference_id);
      return res.status(400).json({ error: "Invalid reference ID format" });
    }

    console.log(`📦 Parsed orderId=${orderId}, userId=${userId}`);

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const orderRef = admin.firestore().collection("orders").doc(orderId);

    const [walletSnap, orderSnap] = await Promise.all([walletRef.get(), orderRef.get()]);

    if (!walletSnap.exists) {
      console.error("❌ Wallet not found for user:", userId);
      return res.status(404).json({ error: "Wallet not found." });
    }

    if (!orderSnap.exists) {
      console.error("❌ Order not found:", orderId);
      return res.status(404).json({ error: "Order not found." });
    }

    const wallet = walletSnap.data();
    const oldBalance = parseFloat(decrypt(wallet?.balance || "0"));
    const platformFee = charge_amount * 0.2;
    const net = charge_amount - platformFee;

    console.log(
      `💰 Charge Breakdown: charged=₱${charge_amount}, net=₱${net}, fee=₱${platformFee}, oldBalance=₱${oldBalance}`
    );

    await admin.firestore().runTransaction(async (t) => {
      t.update(walletRef, {
        balance: encrypt((oldBalance + net).toFixed(2)),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      t.update(orderRef, {
        status: "paid",
        paymentStatus: "paid",
        paymentMethod: channel_code || "BANK",
        xenditChargeId: chargeId,
        platformFee: parseFloat(platformFee.toFixed(2)),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Bank transfer processed for order ${orderId} via ${channel_code}`);
    return res
      .status(200)
      .json({ message: `Bank payment processed successfully via ${channel_code}` });
  } catch (err: any) {
    console.error("❌ Bank webhook handler error:", err.message || err);
    return res.status(500).json({ error: "Bank payment processing failed." });
  }
};
