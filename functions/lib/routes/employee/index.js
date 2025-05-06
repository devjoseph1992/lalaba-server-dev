"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const getEmployees_1 = __importDefault(require("./getEmployees"));
const getRiders_1 = __importDefault(require("./getRiders"));
const getMerchants_1 = __importDefault(require("./getMerchants"));
const addRider_1 = __importDefault(require("./addRider"));
const addMerchant_1 = __importDefault(require("./addMerchant"));
const updateRider_1 = __importDefault(require("./updateRider"));
const updateMerchant_1 = __importDefault(require("./updateMerchant"));
const deleteRider_1 = __importDefault(require("./deleteRider"));
const deleteMerchant_1 = __importDefault(require("./deleteMerchant"));
const router = (0, express_1.Router)();
router.use("/", getEmployees_1.default);
router.use("/", getRiders_1.default);
router.use("/", getMerchants_1.default);
router.use("/", addRider_1.default);
router.use("/", addMerchant_1.default);
router.use("/", updateRider_1.default);
router.use("/", updateMerchant_1.default);
router.use("/", deleteRider_1.default);
router.use("/", deleteMerchant_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map