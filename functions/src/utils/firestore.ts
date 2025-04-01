// functions/src/utils/firestore.ts

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// ✅ Initialize Firebase Admin SDK (Only Once)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL:
      functions.config().app?.database_url || "http://localhost:9000",
  });
  console.log("✅ Firebase Admin initialized.");
}

// ✅ Firestore & Auth References
const db = admin.firestore();
const auth = admin.auth();

export { db, auth }; // ✅ Export Firestore & Auth References

/**
 * ✅ Assigns Role to a User in Firebase Auth
 */
export async function setUserRole(
  uid: string,
  role: "admin" | "employee" | "rider" | "merchant"
) {
  try {
    await auth.setCustomUserClaims(uid, { role });
    console.log(`✅ Role "${role}" assigned to UID: ${uid}`);
  } catch (error) {
    console.error("❌ Error assigning role:", error);
    throw new Error((error as Error).message);
  }
}

/**
 * ✅ Add a New User
 */
export async function addUser(
  email: string,
  password: string,
  role: "admin" | "employee" | "rider" | "merchant"
) {
  try {
    const user = await auth.createUser({
      email,
      password,
      emailVerified: false,
      disabled: false,
    });

    await setUserRole(user.uid, role);
    await db.collection("users").doc(user.uid).set({
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ User created: ${email} with role: ${role}`);
    return { uid: user.uid, email, role };
  } catch (error) {
    console.error("❌ Error creating user:", error);
    throw new Error((error as Error).message);
  }
}

/**
 * ✅ Fetch Users by Role with Pagination
 */
export async function getUsersByRole(
  role: string,
  page = 1,
  limit = 10,
  lastVisibleId?: string // Used for pagination with `startAfter`
) {
  try {
    const usersRef = db
      .collection("users")
      .where("role", "==", role)
      .orderBy("createdAt", "desc");

    // 🔹 Get total count (Separate Query)
    const totalUsersSnapshot = await usersRef.get();
    const totalUsers = totalUsersSnapshot.size;

    // 🔹 Apply pagination
    let query = usersRef.limit(limit);

    // If lastVisibleId is provided, paginate using `startAfter`
    if (lastVisibleId) {
      const lastVisibleDoc = await db
        .collection("users")
        .doc(lastVisibleId)
        .get();
      if (lastVisibleDoc.exists) {
        query = query.startAfter(lastVisibleDoc);
      }
    }

    // Execute query
    const snapshot = await query.get();
    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(
      `✅ Retrieved ${users.length} users with role: ${role} (Page ${page})`
    );

    return {
      users,
      totalPages: Math.ceil(totalUsers / limit),
      totalUsers,
      lastVisible: users.length > 0 ? users[users.length - 1].id : null,
    };
  } catch (error) {
    console.error("❌ Error fetching users by role:", error);
    throw new Error((error as Error).message);
  }
}

/**
 * ✅ Update User Details
 */
export async function updateUser(uid: string, data: object) {
  try {
    await db.collection("users").doc(uid).update(data);
    console.log(`✅ User ${uid} updated successfully`);
    return "User updated successfully";
  } catch (error) {
    console.error("❌ Error updating user:", error);
    throw new Error((error as Error).message);
  }
}

/**
 * ✅ Delete a User
 */
export async function deleteUser(uid: string) {
  try {
    await auth.deleteUser(uid);
    await db.collection("users").doc(uid).delete();
    console.log(`✅ User ${uid} deleted successfully`);
    return "User deleted successfully";
  } catch (error) {
    console.error("❌ Error deleting user:", error);
    throw new Error((error as Error).message);
  }
}
