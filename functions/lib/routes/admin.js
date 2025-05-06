"use strict";
// functions/src/routes/admin.ts
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin = __importStar(require("firebase-admin"));
const firestore_1 = require("../utils/firestore");
const auth_1 = require("../middleware/auth");
const xenditService_1 = require("../services/xenditService");
const walletService_1 = require("../services/walletService");
const userValidation_1 = require("../schema/userValidation");
const ensureDefaultCategories_1 = require("../utils/ensureDefaultCategories");
const createDefaultServices_1 = require("../utils/createDefaultServices");
const zod_1 = __importDefault(require("zod"));
const router = (0, express_1.Router)();
/**
 * ✅ Pagination utility
 */
const paginateResults = (users, page, limit) => {
    const startIndex = (page - 1) * limit;
    const paginatedUsers = users.slice(startIndex, startIndex + limit);
    return {
        users: paginatedUsers,
        pagination: {
            total: users.length,
            page,
            limit,
            totalPages: Math.ceil(users.length / limit),
            hasNextPage: startIndex + limit < users.length,
            hasPrevPage: startIndex > 0,
        },
    };
};
/**
 * ✅ Get users by role
 */
router.get("/role/:role", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { role } = req.params;
        const { page = 1, limit = 10, search = "" } = req.query;
        const userRole = req.user?.role;
        if (userRole === "employee" && role !== "rider" && role !== "merchant") {
            return res.status(403).json({ error: "Unauthorized access." });
        }
        if (userRole === "admin" || userRole === "employee") {
            const users = await (0, firestore_1.getUsersByRole)(role);
            if (search) {
                users.users = users.users.filter((user) => Object.values(user).join(" ").toLowerCase().includes(search.toLowerCase()));
            }
            return res.status(200).json(paginateResults(users.users, page, limit));
        }
        return res.status(403).json({ error: "Unauthorized role access." });
    }
    catch (error) {
        console.error("❌ Error fetching users:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ GET: /employees
 */
router.get("/employees", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const employees = await (0, firestore_1.getUsersByRole)("employee");
        return res.status(200).json(paginateResults(employees.users, page, limit));
    }
    catch (error) {
        console.error("❌ Error fetching employees:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ GET: /riders
 */
router.get("/riders", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const riders = await (0, firestore_1.getUsersByRole)("rider");
        return res.status(200).json(paginateResults(riders.users, page, limit));
    }
    catch (error) {
        console.error("❌ Error fetching riders:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ GET: /merchants
 */
router.get("/merchants", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const merchants = await (0, firestore_1.getUsersByRole)("merchant");
        return res.status(200).json(paginateResults(merchants.users, page, limit));
    }
    catch (error) {
        console.error("❌ Error fetching merchants:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ POST: /add (add new user with role)
 */
router.post("/add", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const validatedData = userValidation_1.userSchema.parse(req.body);
        const { role, email, password, firstName, lastName, phoneNumber, address, tinNumber } = validatedData;
        const createdBy = req.user?.uid;
        let employeeId = "";
        if (role === "employee") {
            employeeId = validatedData.employeeId;
            const existingEmployee = await admin
                .firestore()
                .collection("users")
                .where("employeeId", "==", employeeId)
                .get();
            if (!existingEmployee.empty) {
                return res.status(400).json({
                    error: "❌ Validation Failed",
                    details: [{ path: ["employeeId"], message: "Employee ID already exists." }],
                });
            }
        }
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
            tinNumber,
            role,
            createdBy,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        if (role === "rider") {
            const { driverLicenseNumber, plateNumber, vehicleUnit, barangayClearance, sssNumber, philhealthNumber, } = validatedData;
            userData = {
                ...userData,
                driverLicenseNumber,
                plateNumber,
                vehicleUnit,
                barangayClearance,
                sssNumber,
                philhealthNumber,
            };
        }
        else if (role === "merchant") {
            const { businessName, businessAddress, businessPermit } = validatedData;
            userData = {
                ...userData,
                businessName,
                businessAddress,
                businessPermit,
            };
            // ✅ Create root business doc with timestamps
            const businessRef = admin.firestore().collection("businesses").doc(userRecord.uid);
            await businessRef.set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: true,
            });
            // ✅ Seed default services and categories
            await (0, ensureDefaultCategories_1.ensureDefaultCategories)(userRecord.uid);
            await (0, createDefaultServices_1.createDefaultServices)(userRecord.uid);
            console.log(`✅ Merchant business initialized for: ${userRecord.uid}`);
        }
        else if (role === "employee") {
            const { jobTitle, department, employmentStatus, barangayClearance, sssNumber, philhealthNumber, } = validatedData;
            userData = {
                ...userData,
                jobTitle,
                department,
                employeeId,
                employmentStatus,
                barangayClearance,
                sssNumber,
                philhealthNumber,
            };
        }
        await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
        // ✅ Create wallet
        if (role === "rider" || role === "merchant") {
            try {
                await (0, walletService_1.createWallet)(userRecord.uid);
                console.log(`✅ Wallet created for ${role}: ${userRecord.uid}`);
            }
            catch (error) {
                console.error(`❌ Wallet creation failed for ${role}:`, error);
            }
        }
        // ✅ Create Xendit customer
        if (role === "rider" || role === "merchant") {
            try {
                const customer = await (0, xenditService_1.createXenditCustomer)(userRecord.uid, email, firstName, lastName, phoneNumber);
                await admin.firestore().collection("users").doc(userRecord.uid).update({
                    xenditCustomerId: customer.id,
                    xenditReferenceId: customer.reference_id,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                console.log(`✅ Xendit linked for ${role}: ${userRecord.uid}`);
            }
            catch (error) {
                console.error(`❌ Xendit linkage failed:`, error);
            }
        }
        return res.status(201).json({
            uid: userRecord.uid,
            message: `${role} added successfully.`,
        });
    }
    catch (error) {
        if (error instanceof zod_1.default.ZodError) {
            return res.status(400).json({ error: "❌ Validation Failed", details: error.errors });
        }
        console.error("❌ Error adding user:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ PUT: /update/:uid
 */
router.put("/update/:uid", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        await (0, firestore_1.updateUser)(req.params.uid, req.body);
        if (req.body.email || req.body.password) {
            await admin.auth().updateUser(req.params.uid, {
                email: req.body.email || undefined,
                password: req.body.password || undefined,
            });
        }
        return res.status(200).json({ message: "User updated successfully." });
    }
    catch (error) {
        console.error("❌ Error updating user:", error);
        return res.status(500).json({ error: error.message });
    }
});
/**
 * ✅ DELETE: /delete/:uid
 */
router.delete("/delete/:uid", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        if (req.user && req.user.uid === req.params.uid) {
            return res.status(403).json({ error: "You cannot delete yourself." });
        }
        await (0, firestore_1.deleteUser)(req.params.uid);
        await admin.auth().deleteUser(req.params.uid);
        return res.status(200).json({ message: "User deleted successfully." });
    }
    catch (error) {
        console.error("❌ Error deleting user:", error);
        return res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map