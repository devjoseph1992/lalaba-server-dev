import { Router } from "express";
import { deleteUser } from "../../utils/firestore";
import { verifyFirebaseToken, isAdminOrEmployee } from "../../middleware/auth";

const router = Router();

router.delete("/riders/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    res.status(200).json({ message: "Rider deleted successfully." });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
