import { Router } from "express";
import { topUpWallet } from "../services/walletService";

const router = Router();

/**
 * ✅ Top-Up Wallet Route
 */
router.post("/topup", async (req, res) => {
  try {
    const { userId, amount, paymentMethod } = req.body;

    if (!userId || !amount || !paymentMethod) {
      return res.status(400).json({ error: "Missing required parameters." });
    }

    const response = await topUpWallet(userId, amount, paymentMethod);
    return res.status(200).json(response);
  } catch (error) {
    console.error("❌ Error processing top-up:", error);
    return res.status(500).json({ error: "Top-up failed." });
  }
});

export default router;
