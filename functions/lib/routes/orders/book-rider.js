"use strict";
// functions/src/routes/orders/book-rider.ts
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
const zod_1 = require("zod");
const router = (0, express_1.Router)();
// ✅ Zod schema to validate the body
const bookRiderSchema = zod_1.z.object({
    orderId: zod_1.z.string().min(1),
    deliveryType: zod_1.z.literal("delivery"),
    customerLocation: zod_1.z.object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
    }),
});
router.post("/orders/book-rider", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.user?.uid;
        if (!merchantId) {
            return res.status(401).json({ error: "Unauthorized" });
        }
        // ✅ Validate input using Zod
        const parsed = bookRiderSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
        }
        const { orderId } = parsed.data; // 🔧 only using orderId for now
        // 🔍 Get merchant's business details
        const detailsRef = admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("info")
            .doc("details");
        const detailsSnap = await detailsRef.get();
        const detailsData = detailsSnap.data();
        if (!detailsSnap.exists || !detailsData?.orderTypeDelivery) {
            return res.status(403).json({ error: "Merchant has not enabled delivery." });
        }
        // 📦 Get the order
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const orderSnap = await orderRef.get();
        if (!orderSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        // 🚚 Dummy rider assignment logic (to be replaced with matching logic later)
        const riderId = "AUTO-ASSIGNED-RIDER-ID";
        // ✅ Update the order with rider
        await orderRef.update({
            deliveryType: "delivery",
            riderId,
            status: "assigned-to-rider",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({
            message: "✅ Rider booked successfully.",
            riderId,
        });
    }
    catch (error) {
        console.error("❌ Error booking rider:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=book-rider.js.map