import * as functionsV1 from "firebase-functions/v1";
import * as admin from "firebase-admin";

// Ensure Firebase Admin SDK is initialized once
if (!admin.apps.length) {
  admin.initializeApp();
}

export const onRiderLocationUpdate = functionsV1.database
    .ref("/riderLocations/{orderId}")
    .onWrite(
        async (
            change: functionsV1.Change<any>,
            context: functionsV1.EventContext
        ) => {
          const orderId = context.params.orderId;
          const location = change.after.val();

          if (!location) return null;

          console.log(`📍 Rider for Order ${orderId} moved to:`, location);

          await admin.firestore().collection("riderTrackingLogs").add({
            orderId,
            ...location,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          return null;
        }
    );
