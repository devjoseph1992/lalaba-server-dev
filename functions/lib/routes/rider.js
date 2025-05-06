"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/rider.ts
const express_1 = require("express");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const db = firebase_admin_1.default.database();
const router = (0, express_1.Router)();
router.post("/location", async (req, res) => {
    try {
        const { orderId, latitude, longitude } = req.body;
        if (!orderId || !latitude || !longitude) {
            return res.status(400).send("Missing fields");
        }
        await db.ref(`riderLocations/${orderId}`).set({
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
        });
        return res.send("📍 Location updated");
    }
    catch (error) {
        console.error("❌ Error updating location:", error);
        return res.status(500).send("Internal server error");
    }
});
exports.default = router;
//# sourceMappingURL=rider.js.map