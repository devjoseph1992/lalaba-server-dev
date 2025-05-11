import { Router } from "express";
import * as admin from "firebase-admin";
import { createGcashLinkingSession } from "../../services/createGcashLinkingSession";
import { saveGcashPaymentMethod } from "../../controllers/paymentMethod.logic"; // ✅ import this

const router = Router();

router.post("/link", async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const userDoc = await admin.firestore().collection("users").doc(userId).get();
    const user = userDoc.data();

    if (!user || !user.xenditCustomerId) {
      return res.status(400).json({ error: "User must exist and have a Xendit customer ID" });
    }

    const gcashSnap = await admin
      .firestore()
      .collection("payment_methods")
      .doc(userId)
      .collection("gcash")
      .orderBy("addedAt", "desc")
      .limit(1)
      .get();

    if (gcashSnap.empty) {
      return res.status(400).json({ error: "No GCash number found for this user." });
    }

    const latestGcash = gcashSnap.docs[0].data();
    const phone = latestGcash.mobile_number;

    if (!phone) {
      return res.status(400).json({ error: "Missing mobile number in latest GCash entry." });
    }

    const formattedPhone = phone.startsWith("+63") ? phone : phone.replace(/^0/, "+63");

    const result = await createGcashLinkingSession({
      customerId: user.xenditCustomerId,
      customerPhone: formattedPhone,
      successRedirectUrl: `myapp://payment/gcash_success?uid=${userId}`,
      failureRedirectUrl: `myapp://payment/gcash_failed`,
    });

    // ✅ Save GCash linking metadata in Firestore
    await saveGcashPaymentMethod(userId, {
      tokenId: result.tokenId,
      provider: "GCASH",
      channel_code: "GCASH",
      status: result.status,
      linkedAt: new Date(),
      updatedAt: new Date(),
      mobile_number: phone,
    });

    return res.status(200).json({
      redirectUrl: result.redirectUrl,
      tokenId: result.tokenId,
      status: result.status,
      type: result.type,
    });
  } catch (error: any) {
    console.error("❌ Failed to create GCash linking session:", error);
    return res.status(500).json({
      error: "Failed to create GCash linking session",
      details: error.message || error,
    });
  }
});

export default router;
