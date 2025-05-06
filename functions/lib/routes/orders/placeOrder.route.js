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
const placeOrder_service_1 = require("../../services/placeOrder.service"); // ⬅️ imported modular logic
const router = (0, express_1.Router)();
router.post("/place", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const { merchantId, serviceId, customerLocation, customerAddress, extras = [], estimatedKilo, orderType, paymentMethod, extraChoice, } = req.body;
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // 🧑‍💼 Fetch & validate user
        const userSnap = await admin.firestore().collection("users").doc(userId).get();
        const userData = userSnap.data();
        if (!userData || userData.role !== "customer") {
            return res.status(403).json({ error: "Only customers can place orders." });
        }
        // ✅ Call service to handle full logic
        const result = await (0, placeOrder_service_1.placeOrder)({
            userId,
            userData,
            merchantId,
            serviceId,
            customerLocation,
            customerAddress,
            extras,
            estimatedKilo,
            orderType,
            paymentMethod,
            extraChoice,
        });
        return res.status(201).json(result);
    }
    catch (err) {
        console.error("❌ Error placing order:", err.message || err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=placeOrder.route.js.map