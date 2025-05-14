import { Response } from "express";
import * as admin from "firebase-admin";
import { saveBankPaymentMethod } from "../../controllers/paymentMethod.logic";

export const handleBankLinking = async (
  event: string,
  data: any,
  res: Response
): Promise<Response> => {
  try {
    console.log("📨 handleBankLinking received:", { event, data });

    const tokenId: string = data.id;
    const channelCode: string = data.channel_code;
    const accounts = data.accounts;

    if (!tokenId || !channelCode || !Array.isArray(accounts) || accounts.length === 0) {
      console.error("❌ Missing required bank linking fields:", { tokenId, channelCode, accounts });
      return res.status(400).json({ error: "Missing required fields in payload" });
    }

    const account = accounts[0]; // take the first account from array

    let userId: string | null = null;

    // 🔁 Lookup by tokenId in bank collection
    const fallbackQuery = await admin
      .firestore()
      .collectionGroup("bank")
      .where("tokenId", "==", tokenId)
      .limit(1)
      .get();

    if (!fallbackQuery.empty) {
      const pathParts = fallbackQuery.docs[0].ref.path.split("/");
      userId = pathParts[1];
    }

    if (!userId) {
      console.warn("❌ Unable to resolve userId from tokenId:", tokenId);
      return res.status(200).send("No matching user (webhook logged)");
    }

    const payload = {
      tokenId,
      channelCode,
      status: "SUCCESSFUL", // fixed since it's from a successful event
      accountEmail: "unknown@example.com", // Not in payload
      accountMobileNumber: "0000000000", // Not in payload
      cardLastFour: "0000", // Not in payload
      cardExpiry: "00/00", // Not in payload
      accountHash: account.account_hash,
      accountDetails: account.account_details,
      currency: account.currency,
      linkedAt: new Date(),
      updatedAt: new Date(),
    };

    await saveBankPaymentMethod(userId, payload);
    console.log(`✅ Bank method saved for user ${userId}`);
    return res.status(200).send("Bank payment method saved");
  } catch (error) {
    console.error("❌ handleBankLinking error:", error);
    return res.status(500).json({ error: "Failed to process bank linking event" });
  }
};
