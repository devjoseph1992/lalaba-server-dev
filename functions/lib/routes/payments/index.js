"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gcash_routes_1 = __importDefault(require("./gcash.routes"));
const linkCardAndBank_route_1 = __importDefault(require("./linkCardAndBank.route"));
const router = (0, express_1.Router)();
router.use("/gcash", gcash_routes_1.default); // ✅ /payments/gcash/link
router.use("/banks", linkCardAndBank_route_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map