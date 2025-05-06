import { Router } from "express";
import { verifyFirebaseToken, isAdmin } from "../../middleware/auth";
import { getUsersByRole } from "../../utils/firestore";

const router = Router();

router.get("/merchants", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const merchants = await getUsersByRole("merchant");

    const start = (page - 1) * limit;
    const paginated = merchants.users.slice(start, start + limit);

    return res.status(200).json({
      users: paginated,
      pagination: {
        total: merchants.users.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(merchants.users.length / limit),
        hasNextPage: start + limit < merchants.users.length,
        hasPrevPage: start > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching merchants:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
