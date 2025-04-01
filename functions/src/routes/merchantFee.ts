// functions/src/routes/merchantFee.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../middleware/auth";
import { encrypt, decrypt } from "../utils/encryption";

const router = Router();

/**
 * ✅ Place an Order (Hold 20% Platform Fee)
 */
router.post("/order/place", verifyFirebaseToken, async (req, res) => {
  try {
    const { merchantId, washType, price, customerLocation, extras } = req.body;
    const userId = req.user?.uid;

    if (!merchantId || !washType || !price || !customerLocation) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    const orderRef = admin.firestore().collection("orders").doc();
    const estimatedKilo = 5;

    // ✅ Calculate Estimated Price
    const basePricePerKg = washType === "Premium Wash" ? 130 : 100;
    const estimatedPrice = basePricePerKg * estimatedKilo;
    const platformFee = estimatedPrice * 0.2;

    // ✅ Fetch Merchant Wallet
    const walletRef = admin.firestore().collection("wallets").doc(merchantId);
    const walletSnapshot = await walletRef.get();

    if (!walletSnapshot.exists) {
      return res.status(404).json({ error: "Merchant wallet not found." });
    }

    const walletData = walletSnapshot.data();
    const currentBalance = parseFloat(decrypt(walletData!.balance));

    if (currentBalance < platformFee) {
      return res
        .status(400)
        .json({ error: "Insufficient wallet balance to cover platform fee." });
    }

    const newBalance = currentBalance - platformFee;

    // ✅ Deduct Platform Fee & Hold Until Order Completion
    await walletRef.update({
      balance: encrypt(newBalance.toString()),
      holdAmount: encrypt(platformFee.toString()),
      holdUntil: admin.firestore.Timestamp.fromDate(
        new Date(Date.now() + 30 * 60 * 1000)
      ),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ✅ Create Order in Firestore
    const orderData = {
      orderId: orderRef.id,
      userId,
      merchantId,
      washType,
      estimatedKilo,
      estimatedPrice,
      platformFee,
      status: "pending",
      customerLocation,
      extras,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await orderRef.set(orderData);

    console.log(
      `✅ Order placed: ${orderRef.id}, Platform Fee: ₱${platformFee} deducted.`
    );

    return res.status(201).json({
      message: "Order placed successfully.",
      orderId: orderRef.id,
      estimatedPrice,
      platformFee,
      newBalance,
    });
  } catch (error) {
    console.error("❌ Error placing order:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
