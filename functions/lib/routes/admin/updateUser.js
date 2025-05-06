"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/admin/updateUser.ts
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const auth_1 = require("../../middleware/auth");
const firestore_1 = require("../../utils/firestore");
const router = (0, express_1.Router)();
router.put("/update/:uid", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        await (0, firestore_1.updateUser)(req.params.uid, req.body);
        if (req.body.email || req.body.password) {
            await admin.auth().updateUser(req.params.uid, {
                email: req.body.email || undefined,
                password: req.body.password || undefined,
            });
        }
        return res.status(200).json({ message: "User updated successfully." });
    }
    catch (error) {
        console.error("❌ Error updating user:", error);
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=updateUser.js.map