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
exports.getMerchantDetails = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * Fetches and validates merchant details, including location and business info.
 * @param merchantId Firestore UID of the merchant
 * @returns MerchantDetails object
 * @throws Error if merchant is not valid or data is incomplete
 */
async function getMerchantDetails(merchantId) {
    if (!merchantId)
        throw new Error("Missing merchantId");
    const userRef = admin.firestore().collection("users").doc(merchantId);
    const businessRef = admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("info")
        .doc("details");
    const [userSnap, businessSnap] = await Promise.all([userRef.get(), businessRef.get()]);
    if (!userSnap.exists)
        throw new Error("Merchant not found.");
    const userData = userSnap.data();
    if (userData?.role !== "merchant") {
        throw new Error("Invalid merchant role.");
    }
    const businessData = businessSnap.data();
    if (!businessData || !businessData.coordinates?.lat || !businessData.coordinates?.lng) {
        throw new Error("Incomplete business details.");
    }
    const fullAddress = `${businessData.exactAddress ?? ""}${businessData.barangay ? ", Brgy. " + businessData.barangay : ""}${businessData.city ? ", " + businessData.city : ""}`;
    return {
        merchantId,
        name: userData.name || "Unnamed Merchant",
        role: userData.role,
        coordinates: {
            lat: businessData.coordinates.lat,
            lng: businessData.coordinates.lng,
        },
        address: fullAddress,
        businessName: businessData.businessName || "Unnamed Business", // ✅ now included
    };
}
exports.getMerchantDetails = getMerchantDetails;
//# sourceMappingURL=getMerchantDetails.service.js.map