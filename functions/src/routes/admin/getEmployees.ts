import { Router } from "express";
import { verifyFirebaseToken, isAdmin } from "../../middleware/auth";
import { getUsersByRole } from "../../utils/firestore";

const router = Router();

router.get("/employees", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const employees = await getUsersByRole("employee");

    const start = (page - 1) * limit;
    const paginated = employees.users.slice(start, start + limit);

    return res.status(200).json({
      users: paginated,
      pagination: {
        total: employees.users.length,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(employees.users.length / limit),
        hasNextPage: start + limit < employees.users.length,
        hasPrevPage: start > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
