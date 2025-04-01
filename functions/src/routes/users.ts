// functions/src/routes/users.ts

import { Router } from "express";
import {
  addUser,
  getUsersByRole,
  updateUser,
  deleteUser,
} from "../utils/firestore";
import { isAdmin } from "../middleware/auth";

const router = Router();

/**
 * Get users by role
 */
router.get("/role/:role", isAdmin, async (req, res) => {
  try {
    const { role } = req.params;
    const users = await getUsersByRole(role);
    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Add a new user (Admin only)
 */
router.post("/add", isAdmin, async (req, res) => {
  try {
    const { email, password, role } = req.body;
    if (!email || !password || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const newUser = await addUser(email, password, role);
    return res.status(201).json(newUser);
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Update user details (Admin only)
 */
router.put("/update/:uid", isAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const updates = req.body;
    const message = await updateUser(uid, updates);
    return res.status(200).json({ message });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * Delete a user (Admin only)
 */
router.delete("/delete/:uid", isAdmin, async (req, res) => {
  try {
    const { uid } = req.params;
    const message = await deleteUser(uid);
    return res.status(200).json({ message });
  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
