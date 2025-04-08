import { NextFunction, Response } from "express";
import * as admin from "firebase-admin";
import { CustomRequest } from "../types/global";

export const hasBalance = async (
  req: CustomRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.uid;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const walletSnap = await admin.firestore().collection("wallets").doc(userId).get();

    if (!walletSnap.exists) {
      res.status(403).json({ error: "Wallet not found." });
      return;
    }

    const balance = parseFloat(walletSnap.data()?.balance || "0");

    if (balance <= 0) {
      res.status(403).json({ error: "Insufficient balance." });
      return;
    }

    next();
  } catch (err) {
    console.error("❌ Error checking balance:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
