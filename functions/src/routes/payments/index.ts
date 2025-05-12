import { Router } from "express";
import gcashRoutes from "./gcash.routes";
import linkCardAndBankRoute from "./linkCardAndBank.route";

const router = Router();

router.use("/gcash", gcashRoutes); // ✅ /payments/gcash/link
router.use("/banks", linkCardAndBankRoute);

export default router;
