// function/src/middleware/auth.ts

import { NextFunction, Request, Response } from "express";
import * as admin from "firebase-admin";

/**
 * ✅ Extend Express Request to Include User
 */
declare module "express-serve-static-core" {
  interface Request {
    user?: admin.auth.DecodedIdToken & { role?: string };
  }
}

/**
 * ✅ Middleware to verify Firebase ID Token
 */
export const verifyFirebaseToken = async (req: Request, res: Response, next: NextFunction) => {
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
  } catch (error) {
    console.error("❌ Error verifying token:", error);
    return res.status(401).json({
      message: "Invalid or expired token.",
      error: (error as Error).message,
    });
  }
};

/**
 * ✅ Middleware to Check if User is Admin
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔍 Checking Admin Access for User:", req.user);

    if (!req.user || req.user.role !== "admin") {
      console.warn("🚫 Access Denied: Non-admin user attempted to access an admin-only route.");
      return res.status(403).json({ message: "Admin access required." });
    }
    return next();
  } catch (error) {
    console.error("❌ Error checking admin role:", error);
    return res.status(500).json({ message: "Error checking admin role.", error });
  }
};

/**
 * ✅ Middleware to Check if User is Admin or Employee
 */
export const isAdminOrEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user || !req.user.role || !["admin", "employee"].includes(req.user.role)) {
      console.warn("🚫 Access Denied: User is not an admin or employee.");
      return res.status(403).json({ message: "Admin or Employee access required." });
    }
    return next();
  } catch (error) {
    console.error("❌ Error checking admin/employee role:", error);
    return res.status(500).json({ message: "Error checking admin/employee role.", error });
  }
};

/**
 * ✅ Middleware to Check if User is an Employee
 */
export const isEmployee = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔍 Checking Employee Access for User:", req.user);

    if (!req.user || !req.user.role || !["admin", "employee"].includes(req.user.role)) {
      console.warn("🚫 Access Denied: User is not an employee or admin.");
      return res.status(403).json({ message: "Employee or Admin access required." });
    }
    return next();
  } catch (error) {
    console.error("❌ Error checking employee role:", error);
    return res.status(500).json({ message: "Error checking employee role.", error });
  }
};

/**
 * ✅ Middleware to Check if User is a Rider
 */
export const isRider = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔍 Checking Rider Access for User:", req.user);

    if (!req.user || req.user.role !== "rider") {
      console.warn("🚫 Access Denied: Non-rider user attempted to access a rider-only route.");
      return res.status(403).json({ message: "Rider access required." });
    }
    return next();
  } catch (error) {
    console.error("❌ Error checking rider role:", error);
    return res.status(500).json({ message: "Error checking rider role.", error });
  }
};

/**
 * ✅ Middleware to Check if User is a Merchant
 */
export const isMerchant = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log("🔍 Checking Merchant Access for User:", req.user);

    if (!req.user || req.user.role !== "merchant") {
      console.warn(
        "🚫 Access Denied: Non-merchant user attempted to access a merchant-only route."
      );
      return res.status(403).json({ message: "Merchant access required." });
    }
    return next();
  } catch (error) {
    console.error("❌ Error checking merchant role:", error);
    return res.status(500).json({ message: "Error checking merchant role.", error });
  }
};
