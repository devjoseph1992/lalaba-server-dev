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
const serviceValidation_1 = require("../../schema/serviceValidation");
const router = (0, express_1.Router)();
/**
 * ✅ GET all services for a specific merchant
 */
router.get("/:id/services", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.params.id;
        const snapshot = await admin
            .firestore()
            .collection("businesses")
            .doc(merchantId)
            .collection("services")
            .get();
        const services = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        }));
        return res.status(200).json({ services });
    }
    catch (err) {
        console.error("❌ Failed to fetch services:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
/**
 * ✅ PATCH /businesses/:id/services/serviceId/:name
 */
router.patch("/:id/services/serviceId/:name", auth_1.verifyFirebaseToken, auth_1.isMerchant, async (req, res) => {
    try {
        const merchantId = req.params.id;
        const name = req.params.name;
        if (!["Regular", "Premium"].includes(name)) {
            return res.status(400).json({
                error: "Invalid service name. Only 'Regular' or 'Premium' allowed.",
            });
        }
        // ✅ Validate body using Zod schema
        const parsed = serviceValidation_1.serviceUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Validation failed",
                details: parsed.error.flatten().fieldErrors,
            });
        }
        const { price, inclusions, defaultDetergentId, defaultDetergentName, detergentPerKilo, defaultFabricConditionerId, defaultFabricConditionerName, fabricPerKilo, } = parsed.data;
        const businessRef = admin.firestore().collection("businesses").doc(merchantId);
        const servicesRef = businessRef.collection("services");
        const productRef = businessRef.collection("products");
        // 🔍 Find the service document by name
        const serviceSnap = await servicesRef.where("name", "==", name).limit(1).get();
        if (serviceSnap.empty) {
            return res.status(404).json({ error: `No service found with name: ${name}` });
        }
        const serviceDoc = serviceSnap.docs[0];
        const serviceId = serviceDoc.id;
        // 🔍 Ensure default product IDs exist
        const [detergentSnap, fabricSnap] = await Promise.all([
            productRef.doc(defaultDetergentId).get(),
            productRef.doc(defaultFabricConditionerId).get(),
        ]);
        if (!detergentSnap.exists) {
            return res.status(400).json({ error: "Default detergent not found." });
        }
        if (!fabricSnap.exists) {
            return res.status(400).json({ error: "Default fabric conditioner not found." });
        }
        const now = admin.firestore.FieldValue.serverTimestamp();
        const createdAt = serviceDoc.data().createdAt || now;
        // 🔁 Final payload
        const updatePayload = {
            name,
            price,
            inclusions,
            defaultDetergentId,
            defaultDetergentName,
            detergentPerKilo,
            defaultFabricConditionerId,
            defaultFabricConditionerName,
            fabricPerKilo,
            updatedAt: now,
            createdAt,
        };
        await servicesRef.doc(serviceId).set(updatePayload, { merge: true });
        return res.status(200).json({ message: `✅ ${name} service updated successfully.` });
    }
    catch (err) {
        console.error("❌ Failed to update service:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.default = router;
//# sourceMappingURL=services.js.map