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
exports.createDefaultServices = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * ✅ Seeds default wash services: "Regular" and "Premium"
 * Called after a merchant is created
 */
async function createDefaultServices(merchantId) {
    const db = admin.firestore();
    const servicesRef = db.collection("businesses").doc(merchantId).collection("services");
    const now = admin.firestore.FieldValue.serverTimestamp();
    const defaultServices = [
        {
            name: "Regular",
            type: "regular",
            price: 0,
            inclusions: [],
            estimatedDurationMins: 120,
            available: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            name: "Premium",
            type: "premium",
            price: 0,
            inclusions: [],
            estimatedDurationMins: 180,
            available: false,
            createdAt: now,
            updatedAt: now,
        },
    ];
    for (const service of defaultServices) {
        const exists = await servicesRef.where("type", "==", service.type).limit(1).get();
        if (exists.empty) {
            await servicesRef.doc().set(service);
            console.log(`🧺 Created default service: ${service.name}`);
        }
        else {
            console.log(`✅ Service already exists: ${service.name}`);
        }
    }
}
exports.createDefaultServices = createDefaultServices;
//# sourceMappingURL=createDefaultServices.js.map