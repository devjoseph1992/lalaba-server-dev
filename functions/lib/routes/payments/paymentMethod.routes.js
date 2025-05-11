"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const paymentMethod_controller_1 = require("../../controllers/paymentMethod.controller");
const router = (0, express_1.Router)();
router.post("/", paymentMethod_controller_1.savePaymentMethod); // POST /payments/methods/
exports.default = router; // ✅ <-- this fixes TS1192
//# sourceMappingURL=paymentMethod.routes.js.map