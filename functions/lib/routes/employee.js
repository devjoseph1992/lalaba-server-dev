"use strict";
// functions/src/routes/employee.ts
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
const firestore_1 = require("../utils/firestore");
const walletService_1 = require("../services/walletService");
const xenditService_1 = require("../services/xenditService");
const ensureDefaultCategories_1 = require("../utils/ensureDefaultCategories");
const createDefaultServices_1 = require("../utils/createDefaultServices");
const router = (0, express_1.Router)();
/**
 * ✅ Get All Employees
 */
router.get("/", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        const snapshot = await admin
            .firestore()
            .collection("users")
            .where("role", "==", "employee")
            .get();
        const employees = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({ employees });
    }
    catch (error) {
        console.error("❌ Error fetching employees:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Get All Riders with Pagination
 */
router.get("/riders", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const snapshot = await admin.firestore().collection("users").where("role", "==", "rider").get();
        const totalRiders = snapshot.docs.length;
        const riders = snapshot.docs.slice(startIndex, startIndex + limit).map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({
            riders,
            pagination: {
                total: totalRiders,
                page,
                limit,
                totalPages: Math.ceil(totalRiders / limit),
                hasNextPage: startIndex + limit < totalRiders,
                hasPrevPage: startIndex > 0,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching riders:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Get All Merchants with Pagination
 */
router.get("/merchants", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const snapshot = await admin
            .firestore()
            .collection("users")
            .where("role", "==", "merchant")
            .get();
        const totalMerchants = snapshot.docs.length;
        const merchants = snapshot.docs.slice(startIndex, startIndex + limit).map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({
            merchants,
            pagination: {
                total: totalMerchants,
                page,
                limit,
                totalPages: Math.ceil(totalMerchants / limit),
                hasNextPage: startIndex + limit < totalMerchants,
                hasPrevPage: startIndex > 0,
            },
        });
    }
    catch (error) {
        console.error("❌ Error fetching merchants:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Update Rider
 */
router.put("/riders/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.updateUser)(req.params.id, req.body);
        return res.status(200).json({ message: "Rider updated successfully." });
    }
    catch (error) {
        console.error("❌ Error updating rider:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Delete Rider
 */
router.delete("/riders/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.deleteUser)(req.params.id);
        return res.status(200).json({ message: "Rider deleted successfully." });
    }
    catch (error) {
        console.error("❌ Error deleting rider:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Add Rider or Merchant
 */
const addUser = async (req, res, role) => {
    try {
        const { email, password, firstName, lastName, phoneNumber, address } = req.body;
        const createdBy = req.user?.uid;
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });
        await admin.auth().setCustomUserClaims(userRecord.uid, { role });
        let userData = {
            firstName,
            lastName,
            email,
            phoneNumber,
            address,
            role,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (role === "rider") {
            const { plateNumber, vehicleUnit } = req.body;
            userData = { ...userData, plateNumber, vehicleUnit };
        }
        else if (role === "merchant") {
            const { businessName, businessAddress } = req.body;
            userData = { ...userData, businessName, businessAddress };
            // ✅ Create root business doc
            const businessRef = admin.firestore().collection("businesses").doc(userRecord.uid);
            await businessRef.set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: false, // ✅ Business setup not complete yet
            });
            // ✅ Seed categories and services
            await (0, ensureDefaultCategories_1.ensureDefaultCategories)(userRecord.uid);
            await (0, createDefaultServices_1.createDefaultServices)(userRecord.uid);
            console.log(`✅ Business setup initialized for merchant: ${userRecord.uid}`);
        }
        await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
        await (0, walletService_1.createWallet)(userRecord.uid);
        await (0, xenditService_1.createXenditCustomer)(userRecord.uid, email, firstName, lastName, phoneNumber);
        return res.status(201).json({
            uid: userRecord.uid,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.`,
        });
    }
    catch (error) {
        console.error(`❌ Error adding ${role}:`, error);
        return res.status(500).json({ error: error.message });
    }
};
// ✅ Add Rider
router.post("/riders/add", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, (req, res) => addUser(req, res, "rider"));
// ✅ Add Merchant (with seeded business info)
router.post("/merchants/add", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, (req, res) => addUser(req, res, "merchant"));
/**
 * ✅ Update Merchant
 */
router.put("/merchants/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.updateUser)(req.params.id, req.body);
        return res.status(200).json({ message: "Merchant updated successfully." });
    }
    catch (error) {
        console.error("❌ Error updating merchant:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ Delete Merchant
 */
router.delete("/merchants/:id", auth_1.verifyFirebaseToken, auth_1.isAdminOrEmployee, async (req, res) => {
    try {
        await (0, firestore_1.deleteUser)(req.params.id);
        return res.status(200).json({ message: "Merchant deleted successfully." });
    }
    catch (error) {
        console.error("❌ Error deleting merchant:", error);
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=employee.js.map