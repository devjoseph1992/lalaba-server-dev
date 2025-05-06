"use strict";
// functions/src/routes/customers/businesses.ts
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
const router = (0, express_1.Router)();
/**
 * ✅ GET all businesses with full structure:
 * - Root doc
 * - info/details
 * - services
 * - products
 * - categories
 */
router.get("/businesses", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const businessesRef = admin.firestore().collection("businesses");
        const snapshot = await businessesRef.get();
        const businessList = await Promise.all(snapshot.docs.map(async (doc) => {
            const merchantId = doc.id;
            const rootData = doc.data();
            // 🔍 info/details
            const detailsSnap = await businessesRef
                .doc(merchantId)
                .collection("info")
                .doc("details")
                .get();
            const details = detailsSnap.exists ? detailsSnap.data() : null;
            // 🔍 services
            const servicesSnap = await businessesRef.doc(merchantId).collection("services").get();
            const services = servicesSnap.docs.map((s) => ({
                id: s.id,
                ...s.data(),
            }));
            // 🔍 products
            const productsSnap = await businessesRef.doc(merchantId).collection("products").get();
            const products = productsSnap.docs.map((p) => ({
                id: p.id,
                ...p.data(),
            }));
            // 🔍 categories
            const categoriesSnap = await businessesRef.doc(merchantId).collection("categories").get();
            const categories = categoriesSnap.docs.map((c) => ({
                id: c.id,
                ...c.data(),
            }));
            return {
                merchantId,
                ...rootData,
                details,
                services,
                products,
                categories,
            };
        }));
        return res.status(200).json({ businesses: businessList });
    }
    catch (err) {
        console.error("❌ Error fetching full business data:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=businesses.route.js.map