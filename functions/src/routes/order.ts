// functions/src/routes/order.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken } from "../middleware/auth";

const router = Router();

/**
 * ✅ Middleware: Check if Wallet Has Balance
 */
const hasBalance = async (req: any, res: any, next: any) => {
  try {
    const userId = req.user?.uid;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const walletRef = admin.firestore().collection("wallets").doc(userId);
    const walletSnapshot = await walletRef.get();

    if (
      !walletSnapshot.exists ||
      parseFloat(walletSnapshot.data()?.balance) <= 0
    ) {
      return res.status(403).json({ error: "Insufficient balance in wallet." });
    }

    next();
  } catch (error) {
    console.error("❌ Error checking wallet balance:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * ✅ Place an Order
 */
router.post(
  "/order/place",
  verifyFirebaseToken,
  hasBalance,
  async (req, res) => {
    try {
      const { merchantId, washType, price, customerLocation, extras } =
        req.body;
      const userId = req.user?.uid;

      if (!merchantId || !washType || !price || !customerLocation) {
        return res.status(400).json({ error: "Missing required fields." });
      }

      const merchantRef = admin.firestore().collection("users").doc(merchantId);
      const merchantSnapshot = await merchantRef.get();
      const merchantLocation = merchantSnapshot.data()?.location || null;

      const orderRef = admin.firestore().collection("orders").doc();
      const orderData = {
        orderId: orderRef.id,
        userId,
        merchantId,
        washType,
        price,
        status: "pending",
        customerLocation,
        merchantLocation,
        extras,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await orderRef.set(orderData);
      console.log(`✅ Order placed: ${orderRef.id}`);

      return res
        .status(201)
        .json({ message: "Order placed successfully.", orderId: orderRef.id });
    } catch (error) {
      console.error("❌ Error placing order:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Get Orders (Riders can only see if they have balance)
 */
router.get(
  "/orders/rider",
  verifyFirebaseToken,
  hasBalance,
  async (req, res) => {
    try {
      const ordersRef = admin
        .firestore()
        .collection("orders")
        .where("status", "==", "pending");
      const ordersSnapshot = await ordersRef.get();
      const orders = ordersSnapshot.docs.map((doc) => doc.data());

      return res.status(200).json({ orders });
    } catch (error) {
      console.error("❌ Error fetching orders:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Get Orders for Merchants (Only if they have balance)
 */
router.get(
  "/orders/merchant",
  verifyFirebaseToken,
  hasBalance,
  async (req, res) => {
    try {
      const merchantId = req.user?.uid;
      const ordersRef = admin
        .firestore()
        .collection("orders")
        .where("merchantId", "==", merchantId);
      const ordersSnapshot = await ordersRef.get();
      const orders = ordersSnapshot.docs.map((doc) => doc.data());

      return res.status(200).json({ orders });
    } catch (error) {
      console.error("❌ Error fetching merchant orders:", error);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ Get All Orders (Admin Only)
 */
router.get("/orders/all", verifyFirebaseToken, async (req, res) => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const userRef = admin.firestore().collection("users").doc(userId);
    const userSnapshot = await userRef.get();

    if (userSnapshot.data()?.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    const ordersRef = admin.firestore().collection("orders");
    const ordersSnapshot = await ordersRef.get();
    const orders = ordersSnapshot.docs.map((doc) => doc.data());

    return res.status(200).json({ orders });
  } catch (error) {
    console.error("❌ Error fetching all orders:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
