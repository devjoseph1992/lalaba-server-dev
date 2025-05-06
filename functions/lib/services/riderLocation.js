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
exports.onRiderLocationUpdate = void 0;
const functionsV1 = __importStar(require("firebase-functions/v1"));
const admin = __importStar(require("firebase-admin"));
// Ensure Firebase Admin SDK is initialized once
if (!admin.apps.length) {
    admin.initializeApp();
}
exports.onRiderLocationUpdate = functionsV1.database
    .ref("/riderLocations/{orderId}")
    .onWrite(async (change, context) => {
    const orderId = context.params.orderId;
    const location = change.after.val();
    if (!location)
        return null;
    console.log(`📍 Rider for Order ${orderId} moved to:`, location);
    await admin
        .firestore()
        .collection("riderTrackingLogs")
        .add({
        orderId,
        ...location,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return null;
});
//# sourceMappingURL=riderLocation.js.map