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
exports.sendOrderStatusNotification = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * Send an FCM push notification to user's devices.
 * @param userId - Target user's Firestore ID
 * @param orderId - Related Order ID
 * @param newStatus - New order status or event
 * @param customTitle - (optional) Custom notification title
 * @param customBody - (optional) Custom notification body
 */
async function sendOrderStatusNotification(userId, orderId, newStatus, customTitle, customBody) {
    try {
        // 🔍 Fetch all device tokens for the user
        const tokensSnapshot = await admin
            .firestore()
            .collection("users")
            .doc(userId)
            .collection("tokens") // Assuming you save FCM tokens under users/{userId}/tokens
            .get();
        if (tokensSnapshot.empty) {
            console.log("❌ No device tokens found for user:", userId);
            return;
        }
        const tokens = tokensSnapshot.docs.map((doc) => doc.data().token);
        if (tokens.length === 0) {
            console.log("❌ No valid FCM tokens available.");
            return;
        }
        // 🛠 Prepare the notification message
        const message = {
            notification: {
                title: customTitle || "Order Update",
                body: customBody || `Your order #${orderId} status is now ${newStatus}.`, // Use custom body if provided
            },
            tokens: tokens,
            data: {
                orderId,
                status: newStatus,
            },
        };
        // 🚀 Send push notification
        const response = await admin.messaging().sendMulticast(message);
        console.log(`✅ Notifications sent: ${response.successCount}/${tokens.length} for user ${userId}`);
        if (response.failureCount > 0) {
            console.warn(`⚠️ Some notifications failed:`, response.responses);
        }
    }
    catch (error) {
        console.error("❌ Error sending notification:", error.message || error);
    }
}
exports.sendOrderStatusNotification = sendOrderStatusNotification;
//# sourceMappingURL=sendOrderStatusNotification.js.map