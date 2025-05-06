"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePaymentMethod = void 0;
const firebase_admin_1 = require("firebase-admin");
const encryption_1 = require("../../utils/encryption"); // Adjust path to your encryption utils
const savePaymentMethod = async (req, res) => {
    const { userId, gcashNumber, bank, creditCard, } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "Missing userId" });
    }
    try {
        const ref = (0, firebase_admin_1.firestore)().collection("payment_methods");
        // ✅ Encrypt GCash number
        const encryptedGcash = gcashNumber ? (0, encryption_1.encrypt)(gcashNumber) : null;
        // ✅ Encrypt bank account number (but leave name/plain)
        const encryptedBank = bank
            ? {
                bankName: bank.bankName,
                accountName: bank.accountName,
                accountNumber: (0, encryption_1.encrypt)(bank.accountNumber),
            }
            : null;
        // ✅ Encrypt credit card info
        const encryptedCard = creditCard
            ? {
                cardNumber: (0, encryption_1.encrypt)(creditCard.cardNumber),
                cardHolder: creditCard.cardHolder,
                expiry: (0, encryption_1.encrypt)(creditCard.expiry),
                cvc: (0, encryption_1.encrypt)(creditCard.cvc),
            }
            : null;
        const docRef = await ref.add({
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
//# sourceMappingURL=paymentMethods.js.map