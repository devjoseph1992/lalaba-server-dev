// routes/admin/deleteUser.ts
import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isAdmin } from "../../middleware/auth";
import { deleteUser } from "../../utils/firestore";

const router = Router();

router.delete("/delete/:uid", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    if (req.user?.uid === req.params.uid) {
      return res.status(403).json({ error: "You cannot delete yourself." });
    }

    await deleteUser(req.params.uid);
    await admin.auth().deleteUser(req.params.uid);

    return res.status(200).json({ message: "User deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

export default router;
