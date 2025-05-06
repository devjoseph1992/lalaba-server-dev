"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const firestore_1 = require("../../utils/firestore");
const router = (0, express_1.Router)();
router.get("/merchants", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const merchants = await (0, firestore_1.getUsersByRole)("merchant");
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
    }
    catch (error) {
        console.error("❌ Error fetching merchants:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=getMerchants.js.map