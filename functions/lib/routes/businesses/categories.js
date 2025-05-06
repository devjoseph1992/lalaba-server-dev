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
const categoryValidation_1 = require("../../schema/categoryValidation");
const router = (0, express_1.Router)();
const DEFAULT_CATEGORIES = ["Detergent", "Fabric Conditioner"];
/**
 * ✅ GET all categories for current merchant
 */
router.get("/", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.user.uid;
        const snapshot = await admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("categories")
            .orderBy("sortOrder")
            .get();
        const categories = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({ categories });
    }
    catch (error) {
        console.error("❌ Failed to fetch categories:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ POST new category (with normalized uniqueness)
 */
router.post("/", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.user.uid;
        const { name, icon, sortOrder } = categoryValidation_1.categorySchema.parse(req.body);
        if (DEFAULT_CATEGORIES.includes(name)) {
            return res.status(400).json({
                error: `❌ Cannot create reserved category "${name}"`,
            });
        }
        const nameLower = name.trim().toLowerCase();
        const existing = await admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("categories")
            .where("nameLower", "==", nameLower)
            .limit(1)
            .get();
        if (!existing.empty) {
            return res.status(400).json({ error: "❌ Category name must be unique (case-insensitive)." });
        }
        await admin.firestore().collection("businesses").doc(merchantId).collection("categories").add({
            name,
            nameLower,
            icon,
            sortOrder,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(201).json({ message: "✅ Category added successfully." });
    }
    catch (err) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation Failed", details: err.errors });
        }
        console.error("❌ Error adding category:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ PUT category (non-default only)
 */
router.put("/:categoryId", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.user.uid;
        const categoryId = req.params.categoryId;
        const { name, icon, sortOrder } = categoryValidation_1.categorySchema.parse(req.body);
        const ref = admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("categories")
            .doc(categoryId);
        const snap = await ref.get();
        if (!snap.exists)
            return res.status(404).json({ error: "Category not found." });
        const existing = snap.data();
        if (!existing)
            return res.status(404).json({ error: "Invalid category data." });
        if (DEFAULT_CATEGORIES.includes(existing.name)) {
            return res.status(403).json({
                error: `❌ Cannot update default category "${existing.name}"`,
            });
        }
        const nameLower = name.trim().toLowerCase();
        await ref.update({
            name,
            nameLower,
            icon,
            sortOrder,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({ message: "✅ Category updated successfully." });
    }
    catch (err) {
        if (err.name === "ZodError") {
            return res.status(400).json({ error: "Validation Failed", details: err.errors });
        }
        console.error("❌ Error updating category:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * 🚫 DELETE category — Not allowed for default categories
 */
router.delete("/:categoryId", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.user.uid;
        const ref = admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("categories")
            .doc(req.params.categoryId);
        const snap = await ref.get();
        if (!snap.exists)
            return res.status(404).json({ error: "Category not found." });
        const category = snap.data();
        if (!category)
            return res.status(404).json({ error: "Invalid category data." });
        if (DEFAULT_CATEGORIES.includes(category.name)) {
            return res.status(403).json({
                error: `❌ Cannot delete default category "${category.name}"`,
            });
        }
        await ref.delete();
        return res.status(200).json({ message: "✅ Category deleted successfully." });
    }
    catch (error) {
        console.error("❌ Failed to delete category:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ Mount under `/categories`
 */
const baseRouter = (0, express_1.Router)();
baseRouter.use("/categories", router);
exports.default = baseRouter;
//# sourceMappingURL=categories.js.map