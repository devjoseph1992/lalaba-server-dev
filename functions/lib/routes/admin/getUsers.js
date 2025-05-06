"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/admin/getUsers.ts
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const firestore_1 = require("../../utils/firestore");
const router = (0, express_1.Router)();
const paginateResults = (users, page, limit) => {
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
router.get("/role/:role", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { role } = req.params;
        const { page = 1, limit = 10, search = "" } = req.query;
        const userRole = req.user?.role;
        if (userRole === "employee" && role !== "rider" && role !== "merchant") {
            return res.status(403).json({ error: "Unauthorized access." });
        }
        const users = await (0, firestore_1.getUsersByRole)(role);
        let filtered = users.users;
        if (search) {
            filtered = filtered.filter((user) => Object.values(user).join(" ").toLowerCase().includes(search.toLowerCase()));
        }
        return res.status(200).json(paginateResults(filtered, Number(page), Number(limit)));
    }
    catch (error) {
        console.error("❌ Failed to fetch users:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=getUsers.js.map