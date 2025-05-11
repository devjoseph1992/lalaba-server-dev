import { Router } from "express";
import * as admin from "firebase-admin";
import { createBankLinkingSession } from "../../services/createBankLinkingSession";
import { SupportedBankChannelCode } from "../../services/createBankLinkingSession";
import { saveBankPaymentMethod } from "../../controllers/paymentMethod.logic";

const router = Router();

router.post("/link", async (req, res) => {
  const {
    userId,
    type,
    channelCode,
    cardNumber, // ✅ Full card number
    cardLastFour,
    cardExpiry,
    email: emailFromClient,
    mobileNumber: mobileFromClient,
  } = req.body;

  // ✅ Validate required fields
  if (!userId || type !== "BANK") {
    return res.status(400).json({ error: "Missing or invalid userId or type" });
  }

  if (!channelCode) {
    return res.status(400).json({ error: "Missing channelCode" });
  }

  const cleanedCardNumber = typeof cardNumber === "string" ? cardNumber.replace(/\s/g, "") : "";

  if (!cleanedCardNumber || cleanedCardNumber.length !== 16) {
    return res.status(400).json({ error: "Missing or invalid cardNumber (must be 16 digits)" });
  }

  if (!cardLastFour || cardLastFour.length !== 4) {
    return res.status(400).json({ error: "Missing or invalid cardLastFour" });
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const user = userDoc.data();

    if (!user || !user.xenditCustomerId) {
      return res.status(400).json({ error: "User must exist and have a Xendit customer ID" });
    }

    const xenditCustomerId = user.xenditCustomerId;
    const email = emailFromClient || user.email;
    const mobileNumber = mobileFromClient || user.phone || user.mobileNumber;

    if (!email || !mobileNumber) {
      return res.status(400).json({
        error: "Missing email or mobileNumber from both client and Firestore.",
      });
    }

    const result = await createBankLinkingSession({
      customerId: xenditCustomerId,
      channelCode: channelCode as SupportedBankChannelCode,
      successRedirectUrl: `myapp://payment/bank_success?uid=${userId}`,
      failureRedirectUrl: `myapp://payment/bank_failed`,
      mobileNumber,
      email,
      cardLastFour,
      cardExpiry,
    });

    // ✅ Save to Firestore with card number
    await saveBankPaymentMethod(userId, {
      tokenId: result.tokenId,
      channelCode,
      status: result.status,
      accountEmail: email,
      accountMobileNumber: mobileNumber,
      cardNumber: cleanedCardNumber,
      cardLastFour,
      cardExpiry,
      linkedAt: new Date(),
    });

    return res.status(200).json({
      redirectUrl: result.redirectUrl,
      tokenId: result.tokenId,
      status: result.status,
      type: result.type,
    });
  } catch (error: any) {
    console.error("❌ Failed to create bank linking session:", error);
    return res.status(500).json({
      error: "Failed to create linking session",
      details: error.message || error,
    });
  }
});

export default router;
