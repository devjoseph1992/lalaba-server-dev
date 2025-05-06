"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../middleware/auth");
const addUser_1 = require("../../helpers/addUser");
const router = (0, express_1.Router)();
router.post("/merchants/add", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, (req, res) => (0, addUser_1.addUser)(req, res, "merchant"));
exports.default = router;
//# sourceMappingURL=addMerchant.js.map