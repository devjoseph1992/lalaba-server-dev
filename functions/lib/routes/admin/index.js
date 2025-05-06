"use strict";
// routes/admin/index.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const getUsers_1 = __importDefault(require("./getUsers"));
const addUser_1 = __importDefault(require("./addUser"));
const updateUser_1 = __importDefault(require("./updateUser"));
const deleteUser_1 = __importDefault(require("./deleteUser"));
const getEmployees_1 = __importDefault(require("./getEmployees"));
const getMerchants_1 = __importDefault(require("./getMerchants"));
const getRiders_1 = __importDefault(require("./getRiders"));
const router = (0, express_1.Router)();
router.use("/", getUsers_1.default);
router.use("/", addUser_1.default);
router.use("/", updateUser_1.default);
router.use("/", deleteUser_1.default);
router.use("/", getEmployees_1.default);
router.use("/", getMerchants_1.default);
router.use("/", getRiders_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map