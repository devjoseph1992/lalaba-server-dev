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
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * POST /businesses
 * Allow a merchant to create or update their business info
 */
router.post("/businesses", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const { businessName, barangay, city, exactAddress, coordinates, imageUrl, phoneNumber, openingHours, status = "true", } = req.body;
        // ✅ Validate required fields
        if (!businessName ||
            !barangay ||
            !city ||
            !exactAddress ||
            !coordinates?.lat ||
            !coordinates?.lng ||
            !phoneNumber ||
            !openingHours?.open ||
            !openingHours?.close) {
            return res.status(400).json({ error: "Missing required business fields." });
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        const businessRef = admin.firestore().collection("businesses").doc(userId);
        const detailsRef = businessRef.collection("info").doc("details");
        // 🔍 Get current timestamps if they exist
        const [businessSnap, detailsSnap] = await Promise.all([businessRef.get(), detailsRef.get()]);
        const existingCreatedAtRoot = businessSnap.exists ? businessSnap.data()?.createdAt : null;
        const existingCreatedAtDetails = detailsSnap.exists ? detailsSnap.data()?.createdAt : null;
        // 🧾 Root timestamps
        await businessRef.set({
            createdAt: existingCreatedAtRoot || now,
            updatedAt: now,
        }, { merge: true });
        // 🧾 Info/details document
        await detailsRef.set({
            businessName,
            barangay,
            city,
            exactAddress,
            coordinates,
            imageUrl: imageUrl || null,
            phoneNumber,
            openingHours,
            status,
            createdAt: existingCreatedAtDetails || now,
            updatedAt: now,
        }, { merge: true });
        return res.status(200).json({ message: "Business info saved successfully." });
    }
    catch (err) {
        console.error("❌ Failed to save business info:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=business.js.map