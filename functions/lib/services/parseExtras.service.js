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
exports.parseExtras = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * Parses extras input and fetches product data with price calculation.
 * @param merchantId Firestore UID of the merchant
 * @param extras Array of extras { id, quantity }
 * @param estimatedKilo Estimated kilos to scale quantities
 * @returns Object containing parsed extras and total price
 */
async function parseExtras(merchantId, extras = [], estimatedKilo = 1) {
    const validExtras = extras.filter((extra) => extra?.id);
    if (validExtras.length === 0) {
        return { extraProducts: [], extrasTotal: 0 };
    }
    const extrasSnap = await Promise.all(validExtras.map((extra) => admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("products")
        .doc(extra.id)
        .get()));
    const extraProducts = [];
    let extrasTotal = 0;
    extrasSnap.forEach((snap, index) => {
        const data = snap.data();
        const input = validExtras[index];
        const price = typeof data?.price === "string" ? parseFloat(data.price) : (data?.price ?? 0);
        const rawQuantity = input.quantity || 1;
        const scaledQuantity = rawQuantity * estimatedKilo;
        extraProducts.push({
            id: input.id,
            name: data?.name || "Unknown Extra",
            price,
            quantity: scaledQuantity,
        });
        extrasTotal += price * scaledQuantity;
    });
    return { extraProducts, extrasTotal };
}
exports.parseExtras = parseExtras;
//# sourceMappingURL=parseExtras.service.js.map