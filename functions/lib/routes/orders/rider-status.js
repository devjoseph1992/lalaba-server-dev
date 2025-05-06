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
 * @route   GET /orders/:id/rider-status
 * @desc    Get the current rider's status for a given order from subcollection
 * @access  Authenticated
 */
router.get("/:id/rider-status", auth_1.verifyFirebaseToken, async (req, res) => {
    const orderId = req.params.id;
    const riderId = req.user?.uid;
    if (!riderId) {
        return res.status(401).json({ error: "Unauthorized. No rider UID found." });
    }
    try {
        const orderRef = admin.firestore().collection("orders").doc(orderId);
        const riderDocRef = orderRef.collection("riders").doc(riderId);
        const [riderDocSnap, orderDocSnap] = await Promise.all([riderDocRef.get(), orderRef.get()]);
        if (!orderDocSnap.exists) {
            return res.status(404).json({ error: "Order not found." });
        }
        const orderData = orderDocSnap.data();
        if (!riderDocSnap.exists) {
            return res.status(200).json({
                status: null,
                message: "No rider record yet for this order.",
                isCurrentRider: false,
            });
        }
        const riderData = riderDocSnap.data();
        return res.status(200).json({
            riderId,
            name: riderData?.name || "",
            vehicle: riderData?.vehicle || "",
            plateNumber: riderData?.plateNumber || "",
            status: riderData?.status || null,
            acceptedAt: riderData?.acceptedAt || null,
            isCurrentRider: orderData?.currentRiderId === riderId,
        });
    }
    catch (err) {
        console.error("❌ Failed to get rider status:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=rider-status.js.map