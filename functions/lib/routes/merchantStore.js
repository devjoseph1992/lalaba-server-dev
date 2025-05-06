"use strict";
// functions/src/routes/merchantStore.ts
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
 * ✅ Middleware: Allow Admins & Merchants to Add Stores
 */
const isAdminOrMerchant = async (req, res, next) => {
    try {
        const userId = req.user?.uid;
        if (!userId)
            return res.status(401).json({ error: "Unauthorized" });
        const userRef = admin.firestore().collection("users").doc(userId);
        const userSnapshot = await userRef.get();
        const userRole = userSnapshot.data()?.role;
        if (!userSnapshot.exists || (userRole !== "merchant" && userRole !== "admin")) {
            return res.status(403).json({ error: "Access denied. Only Admins & Merchants allowed." });
        }
        req.user.role = userRole; // Store role in request object for further processing
        next();
    }
    catch (error) {
        console.error("❌ Error checking user role:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};
/**
 * ✅ Add or Update Merchant Store (Admins & Merchants Can Add)
 */
router.post("/store/add", auth_1.verifyFirebaseToken, isAdminOrMerchant, async (req, res) => {
    try {
        const { storeName, location, services, extras, merchantId } = req.body;
        let ownerId = req.user?.uid;
        if (req.user && req.user.role === "admin") {
            if (!merchantId) {
                return res.status(400).json({ error: "Merchant ID is required for admins." });
            }
            ownerId = merchantId; // Admin is adding store for a merchant
        }
        if (!ownerId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!storeName || !location || !services) {
            return res.status(400).json({ error: "Missing required fields." });
        }
        const storeRef = admin.firestore().collection("merchant_stores").doc(ownerId);
        await storeRef.set({
            merchantId: ownerId,
            storeName,
            location,
            services,
            extras,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        console.log(`✅ Merchant store added/updated: ${ownerId}`);
        return res.status(201).json({ message: "Store added successfully." });
    }
    catch (error) {
        console.error("❌ Error adding store:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ Get Merchant Store Details
 * - Merchants can only fetch their own store.
 * - Admins can fetch any merchant's store by providing `merchantId`.
 */
router.get("/store", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const requesterId = req.user?.uid;
        const merchantId = req.query.merchantId || requesterId; // Admin can pass merchantId
        if (!merchantId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        if (!requesterId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        const userRef = admin.firestore().collection("users").doc(requesterId);
        const userSnapshot = await userRef.get();
        const userRole = userSnapshot.data()?.role;
        if (userRole !== "admin" && merchantId !== requesterId) {
            return res.status(403).json({
                error: "Access denied. Merchants can only fetch their own store.",
            });
        }
        const storeRef = admin.firestore().collection("merchant_stores").doc(merchantId);
        const storeSnapshot = await storeRef.get();
        if (!storeSnapshot.exists) {
            return res.status(404).json({ error: "Store not found." });
        }
        return res.status(200).json(storeSnapshot.data());
    }
    catch (error) {
        console.error("❌ Error fetching store:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=merchantStore.js.map