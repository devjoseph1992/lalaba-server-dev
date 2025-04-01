// services/riderLocation.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { Change } from "firebase-functions";

// Ensure Firebase Admin SDK initialized once
if (!admin.apps.length) {
  admin.initializeApp();
}

export const onRiderLocationUpdate = functions.database
  .ref("/riderLocations/{orderId}")
  .onWrite(async (change: Change<any>, context) => {
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
  });// services/riderLocation.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Ensure Firebase Admin SDK initialized once
if (!admin.apps.length) {
  admin.initializeApp();
}

export const onRiderLocationUpdate = functions.database
  .ref("/riderLocations/{orderId}")
  .onWrite(async (change: Change<any>, context) => {
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
  });
