"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePaymentMethod = void 0;
const paymentMethod_logic_1 = require("./paymentMethod.logic");
const encryption_1 = require("../utils/encryption");
const savePaymentMethod = async (req, res) => {
    try {
        const { userId, gcashNumber, bank, creditCard, linkedAccountToken } = req.body;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId" });
        }
        const now = new Date();
        // ✅ Save GCash (working as-is)
        if (gcashNumber ||
            (linkedAccountToken && !linkedAccountToken.channel_code?.startsWith("BA_"))) {
            const gcashEntry = {
                addedAt: now,
                updatedAt: now,
            };
            if (gcashNumber) {
                const cleaned = gcashNumber.replace(/\D/g, "");
                if (!/^\d{11}$/.test(cleaned)) {
                    return res.status(400).json({ error: "GCash number must be 11 digits." });
                }
                gcashEntry.mobile_number = cleaned;
            }
            if (linkedAccountToken) {
                const { provider, linked_account_token_id, channel_code, status } = linkedAccountToken;
                gcashEntry.tokenId = linked_account_token_id;
                gcashEntry.provider = provider;
                gcashEntry.channel_code = channel_code;
                gcashEntry.status = status;
                gcashEntry.linkedAt = now;
            }
            await (0, paymentMethod_logic_1.saveGcashPaymentMethod)(userId, gcashEntry);
        }
        // ✅ Save Bank (relaxed, no accountName/number required)
        if (bank) {
            const { tokenId, channelCode, status, accountEmail, accountMobileNumber, cardNumber, cardLastFour, cardExpiry, } = bank;
            if (!tokenId || !channelCode || !status || !accountEmail || !accountMobileNumber) {
                return res.status(400).json({ error: "Missing required bank fields." });
            }
            const encryptedCardNumber = cardNumber ? (0, encryption_1.encrypt)(cardNumber) : null;
            const bankEntry = {
                tokenId,
                channelCode,
                status,
                accountEmail,
                accountMobileNumber,
                cardNumber: encryptedCardNumber,
                cardLastFour: cardLastFour || null,
                cardExpiry: cardExpiry || null,
                accountNumber: null,
                accountName: null,
                bankName: null,
                linkedAt: now,
            };
            await (0, paymentMethod_logic_1.saveBankPaymentMethod)(userId, bankEntry);
        }
        // ✅ Save Credit Card
        if (creditCard) {
            await (0, paymentMethod_logic_1.saveCreditCardPaymentMethod)(userId, creditCard);
        }
        return res.status(200).json({ message: "Payment method saved successfully." });
    }
    catch (error) {
        console.error("❌ Failed to save payment method:", error);
        return res.status(500).json({ error: error.message });
    }
};
exports.savePaymentMethod = savePaymentMethod;
//# sourceMappingURL=paymentMethod.controller.js.map