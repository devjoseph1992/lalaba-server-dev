import { Router } from "express";
import * as admin from "firebase-admin";
import { createGcashLinkingSession } from "../../services/createGcashLinkingSession";
import { saveGcashPaymentMethod } from "../../controllers/paymentMethod.logic";

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

    // ✅ Optional: try to load saved mobile number
    let phone: string | undefined;
    const gcashSnap = await admin
      .firestore()
      .collection("payment_methods")
      .doc(userId)
      .collection("gcash")
      .orderBy("addedAt", "desc")
      .limit(1)
      .get();

    if (!gcashSnap.empty) {
      const latestGcash = gcashSnap.docs[0].data();
      const mobile = latestGcash?.mobile_number;
      phone = mobile?.startsWith("+63") ? mobile : mobile?.replace(/^0/, "+63");
    }

    // ✅ Create GCash linking session
    const result = await createGcashLinkingSession({
      customerId: user.xenditCustomerId,
      customerPhone: phone, // optional
      successRedirectUrl: `myapp://payment/gcash_success?uid=${userId}`,
      failureRedirectUrl: `myapp://payment/gcash_failed`,
    });

    // ✅ Save token metadata in Firestore
    await saveGcashPaymentMethod(userId, {
      tokenId: result.tokenId,
      provider: "GCASH",
      channel_code: "GCASH",
      status: result.status,
      linkedAt: new Date(),
      updatedAt: new Date(),
      mobile_number: phone ?? null,
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
