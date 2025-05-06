import { Router } from "express";
import { verifyFirebaseToken, isAdminOrEmployee } from "../../middleware/auth";
import { addUser } from "../../helpers/addUser";

const router = Router();

router.post("/riders/add", verifyFirebaseToken, isAdminOrEmployee, (req, res) =>
  addUser(req, res, "rider")
);

export default router;
