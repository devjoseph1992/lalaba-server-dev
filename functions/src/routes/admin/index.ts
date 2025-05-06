// routes/admin/index.ts

import { Router } from "express";
import getUsers from "./getUsers";
import addUser from "./addUser";
import updateUser from "./updateUser";
import deleteUser from "./deleteUser";
import employees from "./getEmployees";
import merchants from "./getMerchants";
import riders from "./getRiders";

const router = Router();

router.use("/", getUsers);
router.use("/", addUser);
router.use("/", updateUser);
router.use("/", deleteUser);

router.use("/", employees);
router.use("/", merchants);
router.use("/", riders);

export default router;
