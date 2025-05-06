import { Router } from "express";

import getEmployees from "./getEmployees";
import getRiders from "./getRiders";
import getMerchants from "./getMerchants";

import addRider from "./addRider";
import addMerchant from "./addMerchant";

import updateRider from "./updateRider";
import updateMerchant from "./updateMerchant";

import deleteRider from "./deleteRider";
import deleteMerchant from "./deleteMerchant";

const router = Router();

router.use("/", getEmployees);
router.use("/", getRiders);
router.use("/", getMerchants);

router.use("/", addRider);
router.use("/", addMerchant);

router.use("/", updateRider);
router.use("/", updateMerchant);

router.use("/", deleteRider);
router.use("/", deleteMerchant);

export default router;
