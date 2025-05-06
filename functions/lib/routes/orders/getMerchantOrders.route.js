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
const router = (0, express_1.Router)();
/**
 * @route   GET /orders/merchant
 * @desc    Get all orders for the authenticated merchant's business
 * @access  Authenticated (Merchant)
 */
router.get("/merchant", async (req, res) => {
    try {
        let merchantId;
        let skipRoleCheck = false;
        // ✅ Emulator mode
        if (process.env.FUNCTIONS_EMULATOR === "true") {
            merchantId = "EwKCXybhIecGSfPZlecqTSCj80K2";
            skipRoleCheck = true;
            console.log("🧪 Emulator: Using mock merchantId →", merchantId);
        }
        else {
            // ✅ Production: verify token
            await (0, auth_1.verifyFirebaseToken)(req, res, () => { });
            merchantId = req.user?.uid;
            if (!merchantId) {
                console.warn("❌ Missing merchant ID in token");
                return res.status(401).json({ error: "Unauthorized" });
            }
            console.log("🔐 Authenticated merchantId:", merchantId);
        }
        // ✅ Role check (skip in emulator)
        if (!skipRoleCheck) {
            const userSnap = await admin.firestore().collection("users").doc(merchantId).get();
            const userData = userSnap.data();
            if (!userSnap.exists || userData?.role !== "merchant") {
                console.warn("🚫 Not a merchant or user doesn't exist:", userData);
                return res.status(403).json({ error: "Forbidden: Only merchants can access this route." });
            }
        }
        // ✅ Build query
        let query = admin
            .firestore()
            .collection("orders")
            .where("merchantId", "==", merchantId)
            .where("status", "in", ["pending", "accepted_by_merchant"]);
        // Add sorting if not using emulator (to avoid index issues)
        if (process.env.FUNCTIONS_EMULATOR !== "true") {
            query = query.orderBy("createdAt", "desc");
        }
        const ordersSnap = await query.get();
        console.log(`📊 Orders found for merchant ${merchantId}: ${ordersSnap.size}`);
        if (ordersSnap.empty) {
            return res.status(404).json({ error: "Order not found." });
        }
        const orders = ordersSnap.docs.map((doc) => {
            const data = doc.data();
            return {
                orderId: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate?.().toISOString() ?? null,
            };
        });
        return res.status(200).json({ orders });
    }
    catch (error) {
        console.error("❌ Error fetching merchant orders:", error.message);
        console.error("📛 Stack:", error.stack);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=getMerchantOrders.route.js.map