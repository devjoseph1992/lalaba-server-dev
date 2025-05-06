"use strict";
// functions/src/utils/firestore.ts
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
exports.deleteUser = exports.updateUser = exports.getUsersByRole = exports.addUser = exports.setUserRole = exports.auth = exports.db = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
// ✅ Initialize Firebase Admin SDK (Only Once)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: functions.config().app?.database_url || "http://localhost:9000",
    });
    console.log("✅ Firebase Admin initialized.");
}
// ✅ Firestore & Auth References
const db = admin.firestore();
exports.db = db;
const auth = admin.auth();
exports.auth = auth;
/**
 * ✅ Assigns Role to a User in Firebase Auth
 */
async function setUserRole(uid, role) {
    try {
        await auth.setCustomUserClaims(uid, { role });
        console.log(`✅ Role "${role}" assigned to UID: ${uid}`);
    }
    catch (error) {
        console.error("❌ Error assigning role:", error);
        throw new Error(error.message);
    }
}
exports.setUserRole = setUserRole;
/**
 * ✅ Add a New User
 */
async function addUser(email, password, role) {
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
    }
    catch (error) {
        console.error("❌ Error creating user:", error);
        throw new Error(error.message);
    }
}
exports.addUser = addUser;
/**
 * ✅ Fetch Users by Role with Pagination
 */
async function getUsersByRole(role, page = 1, limit = 10, lastVisibleId // Used for pagination with `startAfter`
) {
    try {
        const usersRef = db.collection("users").where("role", "==", role).orderBy("createdAt", "desc");
        // 🔹 Get total count (Separate Query)
        const totalUsersSnapshot = await usersRef.get();
        const totalUsers = totalUsersSnapshot.size;
        // 🔹 Apply pagination
        let query = usersRef.limit(limit);
        // If lastVisibleId is provided, paginate using `startAfter`
        if (lastVisibleId) {
            const lastVisibleDoc = await db.collection("users").doc(lastVisibleId).get();
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
        console.log(`✅ Retrieved ${users.length} users with role: ${role} (Page ${page})`);
        return {
            users,
            totalPages: Math.ceil(totalUsers / limit),
            totalUsers,
            lastVisible: users.length > 0 ? users[users.length - 1].id : null,
        };
    }
    catch (error) {
        console.error("❌ Error fetching users by role:", error);
        throw new Error(error.message);
    }
}
exports.getUsersByRole = getUsersByRole;
/**
 * ✅ Update User Details
 */
async function updateUser(uid, data) {
    try {
        await db.collection("users").doc(uid).update(data);
        console.log(`✅ User ${uid} updated successfully`);
        return "User updated successfully";
    }
    catch (error) {
        console.error("❌ Error updating user:", error);
        throw new Error(error.message);
    }
}
exports.updateUser = updateUser;
/**
 * ✅ Delete a User
 */
async function deleteUser(uid) {
    try {
        await auth.deleteUser(uid);
        await db.collection("users").doc(uid).delete();
        console.log(`✅ User ${uid} deleted successfully`);
        return "User deleted successfully";
    }
    catch (error) {
        console.error("❌ Error deleting user:", error);
        throw new Error(error.message);
    }
}
exports.deleteUser = deleteUser;
//# sourceMappingURL=firestore.js.map