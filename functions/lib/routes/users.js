"use strict";
// functions/src/routes/users.ts
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const firestore_1 = require("../utils/firestore");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Get users by role
 */
router.get("/role/:role", auth_1.isAdmin, async (req, res) => {
    try {
        const { role } = req.params;
        const users = await (0, firestore_1.getUsersByRole)(role);
        return res.status(200).json(users);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
/**
 * Add a new user (Admin only)
 */
router.post("/add", auth_1.isAdmin, async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const newUser = await (0, firestore_1.addUser)(email, password, role);
        return res.status(201).json(newUser);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
/**
 * Update user details (Admin only)
 */
router.put("/update/:uid", auth_1.isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const updates = req.body;
        const message = await (0, firestore_1.updateUser)(uid, updates);
        return res.status(200).json({ message });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
/**
 * Delete a user (Admin only)
 */
router.delete("/delete/:uid", auth_1.isAdmin, async (req, res) => {
    try {
        const { uid } = req.params;
        const message = await (0, firestore_1.deleteUser)(uid);
        return res.status(200).json({ message });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map