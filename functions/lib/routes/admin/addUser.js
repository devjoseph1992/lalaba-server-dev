"use strict";
// routes/admin/addUser.ts
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
const auth_1 = require("../../middleware/auth");
const walletService_1 = require("../../services/walletService");
const xenditService_1 = require("../../services/xenditService");
const ensureDefaultCategories_1 = require("../../utils/ensureDefaultCategories");
const createDefaultServices_1 = require("../../utils/createDefaultServices");
const userValidation_1 = require("../../schema/userValidation");
const zod_1 = __importDefault(require("zod"));
const router = (0, express_1.Router)();
router.post("/add", auth_1.verifyFirebaseToken, auth_1.isAdmin, async (req, res) => {
    try {
        const validatedData = userValidation_1.userSchema.parse(req.body);
        const { role, email, password, firstName, lastName, phoneNumber, address, tinNumber } = validatedData;
        const createdBy = req.user?.uid;
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
        // 🔐 Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email,
            password,
            displayName: `${firstName} ${lastName}`,
        });
        await admin.auth().setCustomUserClaims(userRecord.uid, { role });
        // 👤 EMPLOYEE logic
        if (role === "employee") {
            const { employeeId, jobTitle, department, employmentStatus, barangayClearance, sssNumber, philhealthNumber, } = validatedData;
            // Ensure employeeId is unique
            const existing = await admin
                .firestore()
                .collection("users")
                .where("employeeId", "==", employeeId)
                .get();
            if (!existing.empty) {
                return res.status(400).json({
                    error: "❌ Validation Failed",
                    details: [{ path: ["employeeId"], message: "Employee ID already exists." }],
                });
            }
            userData = {
                ...userData,
                employeeId,
                jobTitle,
                department,
                employmentStatus,
                barangayClearance,
                sssNumber,
                philhealthNumber,
            };
        }
        // 🛵 RIDER logic
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
                averageRating: 0,
                ratingCount: 0,
            };
            await (0, walletService_1.createWallet)(userRecord.uid);
        }
        // 🏢 MERCHANT logic
        if (role === "merchant") {
            const { businessName, businessAddress, businessPermit } = validatedData;
            userData = {
                ...userData,
                businessName,
                businessAddress,
                businessPermit,
            };
            // Create business root doc
            const businessRef = admin.firestore().collection("businesses").doc(userRecord.uid);
            await businessRef.set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                merchantId: userRecord.uid,
                status: true,
            });
            await (0, ensureDefaultCategories_1.ensureDefaultCategories)(userRecord.uid);
            await (0, createDefaultServices_1.createDefaultServices)(userRecord.uid);
            await (0, walletService_1.createWallet)(userRecord.uid);
        }
        // ✅ Save user profile
        await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
        // 💸 Link to Xendit
        if (role === "rider" || role === "merchant") {
            const customer = await (0, xenditService_1.createXenditCustomer)(userRecord.uid, email, firstName, lastName, phoneNumber);
            await admin.firestore().collection("users").doc(userRecord.uid).update({
                xenditCustomerId: customer.id,
                xenditReferenceId: customer.reference_id,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
        return res.status(201).json({
            uid: userRecord.uid,
            message: `✅ ${role} added successfully.`,
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
exports.default = router;
//# sourceMappingURL=addUser.js.map