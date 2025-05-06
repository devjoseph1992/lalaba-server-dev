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
exports.addUser = void 0;
const admin = __importStar(require("firebase-admin"));
const walletService_1 = require("../services/walletService");
const xenditService_1 = require("../services/xenditService");
const ensureDefaultCategories_1 = require("../utils/ensureDefaultCategories");
const createDefaultServices_1 = require("../utils/createDefaultServices");
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
        if (role === "merchant") {
            const { businessName, businessAddress } = req.body;
            userData = { ...userData, businessName, businessAddress };
            await admin.firestore().collection("businesses").doc(userRecord.uid).set({
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                status: false,
            });
            await (0, ensureDefaultCategories_1.ensureDefaultCategories)(userRecord.uid);
            await (0, createDefaultServices_1.createDefaultServices)(userRecord.uid);
        }
        await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
        await (0, walletService_1.createWallet)(userRecord.uid);
        await (0, xenditService_1.createXenditCustomer)(userRecord.uid, email, firstName, lastName, phoneNumber);
        res.status(201).json({
            uid: userRecord.uid,
            message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.`,
        });
    }
    catch (error) {
        console.error(`❌ Error adding ${role}:`, error);
        res.status(500).json({ error: error.message });
    }
};
exports.addUser = addUser;
//# sourceMappingURL=addUser.js.map