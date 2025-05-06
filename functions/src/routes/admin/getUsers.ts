// routes/admin/getUsers.ts
import { Router } from "express";
import { verifyFirebaseToken } from "../../middleware/auth";
import { getUsersByRole } from "../../utils/firestore";

const router = Router();

const paginateResults = (users: any[], page: number, limit: number) => {
  const startIndex = (page - 1) * limit;
  const paginatedUsers = users.slice(startIndex, startIndex + limit);

  return {
    users: paginatedUsers,
    pagination: {
      total: users.length,
      page,
      limit,
      totalPages: Math.ceil(users.length / limit),
      hasNextPage: startIndex + limit < users.length,
      hasPrevPage: startIndex > 0,
    },
  };
};

router.get("/role/:role", verifyFirebaseToken, async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query as any;
    const userRole = req.user?.role;

    if (userRole === "employee" && role !== "rider" && role !== "merchant") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const users = await getUsersByRole(role);
    let filtered = users.users;

    if (search) {
      filtered = filtered.filter((user: any) =>
        Object.values(user).join(" ").toLowerCase().includes(search.toLowerCase())
      );
    }

    return res.status(200).json(paginateResults(filtered, Number(page), Number(limit)));
  } catch (error) {
    console.error("❌ Failed to fetch users:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
