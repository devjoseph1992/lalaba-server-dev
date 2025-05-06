"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethod_controller_1 = require("../../controllers/paymentMethod.controller"); // Make sure the path is correct
const router = (0, express_1.Router)();
// ✅ POST /api/payment-methods
router.post("/payment-methods", paymentMethod_controller_1.savePaymentMethod);
exports.default = router;
//# sourceMappingURL=paymentMethod.routes.js.map