import { Router } from "express";
import { savePaymentMethod } from "../../controllers/paymentMethod.controller"; // Make sure the path is correct

const router = Router();

// ✅ POST /api/payment-methods
router.post("/payment-methods", savePaymentMethod);

export default router;
