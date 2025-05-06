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
exports.hasBalance = void 0;
const admin = __importStar(require("firebase-admin"));
const hasBalance = async (req, res, next) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // 🔍 Get user role
        const userSnap = await admin.firestore().collection("users").doc(userId).get();
        const userData = userSnap.data();
        const role = userData?.role;
        // ✅ Skip balance check for customers
        if (role === "customer") {
            return next();
        }
        // 👇 Balance check applies to merchants and riders
        const walletSnap = await admin.firestore().collection("wallets").doc(userId).get();
        if (!walletSnap.exists) {
            res.status(403).json({ error: "Wallet not found." });
            return;
        }
        const balance = parseFloat(walletSnap.data()?.balance || "0");
        if (balance <= 0) {
            res.status(403).json({ error: "Insufficient balance." });
            return;
        }
        next();
    }
    catch (err) {
        console.error("❌ Error checking balance:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
exports.hasBalance = hasBalance;
//# sourceMappingURL=hasBalance.js.map