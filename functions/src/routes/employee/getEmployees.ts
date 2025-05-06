import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isAdminOrEmployee } from "../../middleware/auth";

const router = Router();

router.get("/", verifyFirebaseToken, isAdminOrEmployee, async (_, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "employee")
      .get();
    const employees = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    res.status(200).json({ employees });
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
