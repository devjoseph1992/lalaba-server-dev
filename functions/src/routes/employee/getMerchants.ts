import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isAdminOrEmployee } from "../../middleware/auth";

const router = Router();

router.get("/merchants", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const start = (page - 1) * limit;

    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "merchant")
      .get();
    const total = snapshot.size;
    const merchants = snapshot.docs
      .slice(start, start + limit)
      .map((doc) => ({ id: doc.id, ...doc.data() }));

    res.status(200).json({
      merchants,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: start + limit < total,
        hasPrevPage: start > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching merchants:", error);
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
