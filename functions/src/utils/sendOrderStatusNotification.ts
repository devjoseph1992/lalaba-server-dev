import * as admin from "firebase-admin";

/**
 * Send an FCM push notification to user's devices.
 * @param userId - Target user's Firestore ID
 * @param orderId - Related Order ID
 * @param newStatus - New order status or event
 * @param customTitle - (optional) Custom notification title
 * @param customBody - (optional) Custom notification body
 */
export async function sendOrderStatusNotification(
  userId: string,
  orderId: string,
  newStatus: string,
  customTitle?: string,
  customBody?: string
) {
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
        title: customTitle || "Order Update", // Use custom title if provided
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

    console.log(
      `✅ Notifications sent: ${response.successCount}/${tokens.length} for user ${userId}`
    );
    if (response.failureCount > 0) {
      console.warn(`⚠️ Some notifications failed:`, response.responses);
    }
  } catch (error: any) {
    console.error("❌ Error sending notification:", error.message || error);
  }
}
