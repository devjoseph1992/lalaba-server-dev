"use strict";
// function/src/middleware/auth.ts
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
exports.isMerchant = exports.isRider = exports.isEmployee = exports.isAdminOrEmployee = exports.isAdmin = exports.verifyFirebaseToken = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * ✅ Middleware to verify Firebase ID Token
 */
const verifyFirebaseToken = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split("Bearer ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized: No token provided." });
        }
        // 🔹 Verify Firebase token
        const decodedToken = await admin.auth().verifyIdToken(token);
        // 🔹 Fetch user role from Firestore
        const userDoc = await admin.firestore().collection("users").doc(decodedToken.uid).get();
        const userRole = userDoc.exists ? userDoc.data()?.role : "user"; // Default to "user"
        // 🔹 Attach full decodedToken + role to `req.user`
        req.user = { ...decodedToken, role: userRole }; // ✅ FIXED: Now stored in `req.user`
        console.log(`✅ Verified Token for UID: ${decodedToken.uid}, Role: ${req.user.role}`);
        return next();
    }
    catch (error) {
        console.error("❌ Error verifying token:", error);
        return res.status(401).json({
            message: "Invalid or expired token.",
            error: error.message,
        });
    }
};
exports.verifyFirebaseToken = verifyFirebaseToken;
/**
 * ✅ Middleware to Check if User is Admin
 */
const isAdmin = async (req, res, next) => {
    try {
        console.log("🔍 Checking Admin Access for User:", req.user);
        if (!req.user || req.user.role !== "admin") {
            console.warn("🚫 Access Denied: Non-admin user attempted to access an admin-only route.");
            return res.status(403).json({ message: "Admin access required." });
        }
        return next();
    }
    catch (error) {
        console.error("❌ Error checking admin role:", error);
        return res.status(500).json({ message: "Error checking admin role.", error });
    }
};
exports.isAdmin = isAdmin;
/**
 * ✅ Middleware to Check if User is Admin or Employee
 */
const isAdminOrEmployee = async (req, res, next) => {
    try {
        if (!req.user || !req.user.role || !["admin", "employee"].includes(req.user.role)) {
            console.warn("🚫 Access Denied: User is not an admin or employee.");
            return res.status(403).json({ message: "Admin or Employee access required." });
        }
        return next();
    }
    catch (error) {
        console.error("❌ Error checking admin/employee role:", error);
        return res.status(500).json({ message: "Error checking admin/employee role.", error });
    }
};
exports.isAdminOrEmployee = isAdminOrEmployee;
/**
 * ✅ Middleware to Check if User is an Employee
 */
const isEmployee = async (req, res, next) => {
    try {
        console.log("🔍 Checking Employee Access for User:", req.user);
        if (!req.user || !req.user.role || !["admin", "employee"].includes(req.user.role)) {
            console.warn("🚫 Access Denied: User is not an employee or admin.");
            return res.status(403).json({ message: "Employee or Admin access required." });
        }
        return next();
    }
    catch (error) {
        console.error("❌ Error checking employee role:", error);
        return res.status(500).json({ message: "Error checking employee role.", error });
    }
};
exports.isEmployee = isEmployee;
/**
 * ✅ Middleware to Check if User is a Rider
 */
const isRider = async (req, res, next) => {
    try {
        console.log("🔍 Checking Rider Access for User:", req.user);
        if (!req.user || req.user.role !== "rider") {
            console.warn("🚫 Access Denied: Non-rider user attempted to access a rider-only route.");
            return res.status(403).json({ message: "Rider access required." });
        }
        return next();
    }
    catch (error) {
        console.error("❌ Error checking rider role:", error);
        return res.status(500).json({ message: "Error checking rider role.", error });
    }
};
exports.isRider = isRider;
/**
 * ✅ Middleware to Check if User is a Merchant
 */
const isMerchant = async (req, res, next) => {
    try {
        console.log("🔍 Checking Merchant Access for User:", req.user);
        if (!req.user || req.user.role !== "merchant") {
            console.warn("🚫 Access Denied: Non-merchant user attempted to access a merchant-only route.");
            return res.status(403).json({ message: "Merchant access required." });
        }
        return next();
    }
    catch (error) {
        console.error("❌ Error checking merchant role:", error);
        return res.status(500).json({ message: "Error checking merchant role.", error });
    }
};
exports.isMerchant = isMerchant;
//# sourceMappingURL=auth.js.map