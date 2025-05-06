"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePaymentMethod = void 0;
const firebase_admin_1 = require("firebase-admin");
const encryption_1 = require("../utils/encryption");
const validators_1 = require("../utils/validators"); // Make sure this file contains the validation logic below
const savePaymentMethod = async (req, res) => {
    const { userId, gcashNumber, bank, creditCard, } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }
    try {
        // ✅ Validate GCash number
        let encryptedGcash = null;
        if (gcashNumber) {
            const cleaned = gcashNumber.replace(/\D/g, "");
            if (!/^\d{11}$/.test(cleaned)) {
                return res.status(400).json({
                    error: "GCash number must be exactly 11 digits.",
                });
            }
            encryptedGcash = (0, encryption_1.encrypt)(cleaned);
        }
        // ✅ Validate and encrypt bank info
        let encryptedBank = null;
        if (bank) {
            const { bankName, accountName, accountNumber } = bank;
            if (!bankName || !accountName || !accountNumber) {
                return res.status(400).json({
                    error: "Bank info is incomplete. Required: bankName, accountName, accountNumber.",
                });
            }
            if (!/^\d+$/.test(accountNumber)) {
                return res.status(400).json({
                    error: "Bank account number must be numeric.",
                });
            }
            encryptedBank = {
                bankName,
                accountName,
                accountNumber: (0, encryption_1.encrypt)(accountNumber),
            };
        }
        // ✅ Validate and encrypt credit card
        let encryptedCard = null;
        if (creditCard) {
            const { cardNumber, cardHolder, expiry, cvc } = creditCard;
            if (!cardNumber || !cardHolder || !expiry || !cvc) {
                return res.status(400).json({
                    error: "Credit card info is incomplete. Required: cardNumber, cardHolder, expiry, cvc.",
                });
            }
            if (!(0, validators_1.isValidCardNumber)(cardNumber)) {
                return res.status(400).json({ error: "Invalid credit card number." });
            }
            if (!(0, validators_1.isValidExpiry)(expiry)) {
                return res.status(400).json({
                    error: "Invalid expiry format. Use MM/YY or MM/YYYY, and must be a future date.",
                });
            }
            if (!(0, validators_1.isValidCVC)(cvc)) {
                return res.status(400).json({
                    error: "Invalid CVC. Must be 3 or 4 digits.",
                });
            }
            encryptedCard = {
                cardNumber: (0, encryption_1.encrypt)(cardNumber),
                cardHolder,
                expiry: (0, encryption_1.encrypt)(expiry),
                cvc: (0, encryption_1.encrypt)(cvc),
            };
        }
        // ✅ Save to Firestore
        const docRef = await (0, firebase_admin_1.firestore)().collection("payment_methods").add({
            userId,
            gcashNumber: encryptedGcash,
            bank: encryptedBank,
            creditCard: encryptedCard,
            createdAt: firebase_admin_1.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(201).json({
            message: "Payment method saved successfully",
            id: docRef.id,
        });
    }
    catch (error) {
        console.error("❌ Error saving payment method:", error);
        return res.status(500).json({
            error: "Failed to save payment method",
            details: error.message,
        });
    }
};
exports.savePaymentMethod = savePaymentMethod;
//# sourceMappingURL=paymentMethod.controller.js.map