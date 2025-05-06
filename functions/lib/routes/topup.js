"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const walletService_1 = require("../services/walletService");
const router = (0, express_1.Router)();
/**
 * ✅ Top-Up Wallet Route
 */
router.post("/topup", async (req, res) => {
    try {
        const { userId, amount, paymentMethod } = req.body;
        if (!userId || !amount || !paymentMethod) {
            return res.status(400).json({ error: "Missing required parameters." });
        }
        const response = await (0, walletService_1.topUpWallet)(userId, amount, paymentMethod);
        return res.status(200).json(response);
    }
    catch (error) {
        console.error("❌ Error processing top-up:", error);
        return res.status(500).json({ error: "Top-up failed." });
    }
});
exports.default = router;
//# sourceMappingURL=topup.js.map