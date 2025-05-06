import { Request, Response } from "express";
import * as admin from "firebase-admin";
import { decrypt, encrypt } from "../utils/encryption";

export const handleCard = async (req: Request, res: Response) => {
  try {
    const data = req.body.data;
    const { reference_id, charge_amount, id: chargeId, status } = data;

    if (!reference_id || !charge_amount || !chargeId) {
      console.error("❌ Missing required Card fields");
      return res.status(400).json({ error: "Missing required fields." });
    }

    console.log(`📩 Card webhook received`);
    console.log(
      `🔍 reference_id: ${reference_id}, chargeId: ${chargeId}, amount: ₱${charge_amount}, status: ${status}`
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
        paymentMethod: "Credit Card",
        xenditChargeId: chargeId,
        platformFee: parseFloat(platformFee.toFixed(2)),
        paidAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    console.log(`✅ Credit card payment processed successfully for order ${orderId}`);
    return res.status(200).json({ message: "Credit card payment processed successfully." });
  } catch (err: any) {
    console.error("❌ Card webhook handler error:", err.message || err);
    return res.status(500).json({ error: "Credit card payment failed." });
  }
};
