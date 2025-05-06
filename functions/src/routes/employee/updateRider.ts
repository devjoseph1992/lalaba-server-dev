import { Router } from "express";
import { verifyFirebaseToken, isAdminOrEmployee } from "../../middleware/auth";
import { updateUser } from "../../utils/firestore";

const router = Router();

router.put("/riders/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await updateUser(req.params.id, req.body);
    res.status(200).json({ message: "Rider updated successfully." });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
