"use strict";
// functions/src/routes/riderLocation.ts
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
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * ✅ Update Rider's Live Location (Realtime Database)
 */
router.post("/rider/location", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const riderId = req.user?.uid;
        const { latitude, longitude } = req.body;
        if (!latitude || !longitude) {
            return res.status(400).json({ error: "Latitude and Longitude are required." });
        }
        // ✅ Save rider's location in Realtime Database
        await admin.database().ref(`/rider_locations/${riderId}`).set({
            latitude,
            longitude,
            updatedAt: admin.database.ServerValue.TIMESTAMP,
        });
        console.log(`✅ Rider ${riderId} location updated.`);
        return res.status(200).json({ message: "Location updated successfully." });
    }
    catch (error) {
        console.error("❌ Error updating rider location:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ Get All Riders' Live Locations
 */
router.get("/riders/locations", auth_1.verifyFirebaseToken, async (req, res) => {
    try {
        const snapshot = await admin.database().ref("/rider_locations").once("value");
        const riders = snapshot.val();
        if (!riders) {
            return res.status(404).json({ error: "No rider locations available." });
        }
        return res.status(200).json({ riders });
    }
    catch (error) {
        console.error("❌ Error fetching rider locations:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=riderLocation.js.map