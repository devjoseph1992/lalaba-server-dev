// routes/admin/updateUser.ts
import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isAdmin } from "../../middleware/auth";
import { updateUser } from "../../utils/firestore";

const router = Router();

router.put("/update/:uid", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    await updateUser(req.params.uid, req.body);

    if (req.body.email || req.body.password) {
      await admin.auth().updateUser(req.params.uid, {
        email: req.body.email || undefined,
        password: req.body.password || undefined,
      });
    }

    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

export default router;
