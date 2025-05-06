"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const firestore_1 = require("../../utils/firestore");
const router = (0, express_1.Router)();
router.get("/riders", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const riders = await (0, firestore_1.getUsersByRole)("rider");
        const start = (page - 1) * limit;
        const paginated = riders.users.slice(start, start + limit);
        return res.status(200).json({
            users: paginated,
            pagination: {
                total: riders.users.length,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(riders.users.length / limit),
                hasNextPage: start + limit < riders.users.length,
                hasPrevPage: start > 0,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching riders:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=getRiders.js.map