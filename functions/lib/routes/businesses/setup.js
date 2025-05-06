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
const auth_1 = require("../../middleware/auth");
const businessValidation_1 = require("../../schema/businessValidation");
const router = (0, express_1.Router)();
router.post("/setup", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const userId = req.user?.uid;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        // ✅ Validate request body using Zod
        const validation = businessValidation_1.businessSetupSchema.safeParse(req.body);
        if (!validation.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: validation.error.flatten().fieldErrors,
            });
        }
        const { businessName, barangay, city, exactAddress, coordinates, imageUrl, phoneNumber, openingHours, orderTypeDelivery, status, description, // ✅ optional new field
         } = validation.data;
        const now = admin.firestore.FieldValue.serverTimestamp();
        const businessRef = admin.firestore().collection("businesses").doc(userId);
        const detailsRef = businessRef.collection("info").doc("details");
        // 🔍 Fetch existing docs to preserve createdAt
        const [businessSnap, detailsSnap] = await Promise.all([businessRef.get(), detailsRef.get()]);
        const existingRoot = businessSnap.exists ? businessSnap.data() : null;
        const existingDetails = detailsSnap.exists ? detailsSnap.data() : null;
        // ✅ Set root business document
        await businessRef.set({
            merchantId: userId,
            createdAt: existingRoot?.createdAt || now,
            updatedAt: now,
            isOnline: existingRoot?.isOnline ?? false,
        }, { merge: true });
        // ✅ Set business info/details document
        await detailsRef.set({
            businessName,
            barangay,
            city,
            exactAddress,
            coordinates,
            imageUrl: imageUrl || null,
            phoneNumber,
            openingHours,
            orderTypeDelivery,
            status: typeof status === "boolean" ? status : false,
            description: description || "",
            rating: existingDetails?.rating ?? 0,
            reviews: existingDetails?.reviews ?? [],
            createdAt: existingDetails?.createdAt || now,
            updatedAt: now,
        }, { merge: true });
        return res.status(200).json({ message: "Business setup completed." });
    }
    catch (err) {
        console.error("❌ Failed to setup business:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=setup.js.map