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
router.get("/customer", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const customerId = req.user?.uid;
        console.log("🧑‍💼 Authenticated customer ID:", customerId);
        if (!customerId) {
            console.warn("⚠️ No customer ID found in token");
            return res.status(401).json({ error: "Unauthorized" });
        }
        const query = admin
            .firestore()
            .collection("orders")
            .where("customerId", "==", customerId)
            .orderBy("createdAt", "desc");
        console.log("🔎 Running Firestore query for customer orders...");
        const snapshot = await query.get();
        console.log(`✅ Query returned ${snapshot.size} order(s)`);
        if (snapshot.empty) {
            console.log("📭 No orders found for this customer.");
        }
        const orders = snapshot.docs.map((doc, i) => {
            const data = doc.data();
            console.log(`📦 Order #${i + 1}:`, {
                orderId: doc.id,
                createdAt: data.createdAt,
                status: data.status,
            });
            return {
                orderId: doc.id,
                ...data,
            };
        });
        return res.status(200).json({ orders });
    }
    catch (error) {
        console.error("❌ Error in /orders/customer:", error.message);
        console.error("📛 Stack Trace:", error.stack);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=getCustomerOrders.route.js.map