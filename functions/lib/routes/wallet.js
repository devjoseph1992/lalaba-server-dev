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
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const encryption_1 = require("../utils/encryption");
const router = (0, express_1.Router)();
/**
 * ✅ Get Wallet Balance & Account Number
 */
router.get("/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }
        // ✅ Fetch Wallet Data
        const walletRef = admin.firestore().collection("wallets").doc(userId);
        const walletSnapshot = await walletRef.get();
        if (!walletSnapshot.exists) {
            console.error(`❌ Wallet not found for user: ${userId}`);
            return res.status(404).json({ error: "Wallet not found" });
        }
        const walletData = walletSnapshot.data();
        if (!walletData || !walletData.balance) {
            console.error(`❌ Wallet data missing for user: ${userId}`, walletData);
            return res.status(500).json({ error: "Wallet data is missing" });
        }
        console.log("✅ Wallet Data from Firestore:", walletData);
        // ✅ Debug Before Decrypting
        if (typeof walletData.balance !== "string") {
            console.error(`❌ Invalid balance format for user: ${userId}`, walletData.balance);
            return res.status(500).json({ error: "Invalid wallet balance format" });
        }
        // 🔹 Attempt to decrypt the balance
        let decryptedBalance;
        try {
            decryptedBalance = (0, encryption_1.decrypt)(walletData.balance);
        }
        catch (decryptError) {
            console.error(`❌ Error decrypting balance for user: ${userId}`, decryptError);
            return res.status(500).json({ error: "Error decrypting wallet balance" });
        }
        console.log(`✅ Decrypted Balance for ${userId}:`, decryptedBalance);
        return res.status(200).json({
            userId,
            accountNumber: walletData.accountNumber || "N/A",
            balance: parseFloat(decryptedBalance),
            currency: "PHP",
            updatedAt: walletData.updatedAt?.toDate() || null,
        });
    }
    catch (error) {
        console.error("❌ Error fetching wallet balance:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.default = router;
//# sourceMappingURL=wallet.js.map