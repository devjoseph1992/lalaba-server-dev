// functions/src/routes/employee.ts

import { Request, Response, Router } from "express";
import * as admin from "firebase-admin";
import { isAdminOrEmployee, verifyFirebaseToken } from "../middleware/auth";
import { deleteUser, updateUser } from "../utils/firestore";
import { createWallet } from "../services/walletService";
import { createXenditCustomer } from "../services/xenditService";
import { ensureDefaultCategories } from "../utils/ensureDefaultCategories";
import { createDefaultServices } from "../utils/createDefaultServices";

const router = Router();

/**
 * ✅ Get All Employees
 */
router.get("/", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "employee")
      .get();
    const employees = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json({ employees });
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Get All Riders with Pagination
 */
router.get("/riders", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const snapshot = await admin.firestore().collection("users").where("role", "==", "rider").get();
    const totalRiders = snapshot.docs.length;
    const riders = snapshot.docs.slice(startIndex, startIndex + limit).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      riders,
      pagination: {
        total: totalRiders,
        page,
        limit,
        totalPages: Math.ceil(totalRiders / limit),
        hasNextPage: startIndex + limit < totalRiders,
        hasPrevPage: startIndex > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching riders:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Get All Merchants with Pagination
 */
router.get("/merchants", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const startIndex = (page - 1) * limit;

    const snapshot = await admin
      .firestore()
      .collection("users")
      .where("role", "==", "merchant")
      .get();
    const totalMerchants = snapshot.docs.length;
    const merchants = snapshot.docs.slice(startIndex, startIndex + limit).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({
      merchants,
      pagination: {
        total: totalMerchants,
        page,
        limit,
        totalPages: Math.ceil(totalMerchants / limit),
        hasNextPage: startIndex + limit < totalMerchants,
        hasPrevPage: startIndex > 0,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching merchants:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Update Rider
 */
router.put("/riders/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await updateUser(req.params.id, req.body);
    return res.status(200).json({ message: "Rider updated successfully." });
  } catch (error) {
    console.error("❌ Error updating rider:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Delete Rider
 */
router.delete("/riders/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    return res.status(200).json({ message: "Rider deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting rider:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Add Rider or Merchant
 */
const addUser = async (req: Request, res: Response, role: "rider" | "merchant") => {
  try {
    const { email, password, firstName, lastName, phoneNumber, address } = req.body;
    const createdBy = req.user?.uid;

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    let userData: any = {
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      role,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (role === "rider") {
      const { plateNumber, vehicleUnit } = req.body;
      userData = { ...userData, plateNumber, vehicleUnit };
    } else if (role === "merchant") {
      const { businessName, businessAddress } = req.body;
      userData = { ...userData, businessName, businessAddress };

      // ✅ Create root business doc
      const businessRef = admin.firestore().collection("businesses").doc(userRecord.uid);
      await businessRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: false, // ✅ Business setup not complete yet
      });

      // ✅ Seed categories and services
      await ensureDefaultCategories(userRecord.uid);
      await createDefaultServices(userRecord.uid);

      console.log(`✅ Business setup initialized for merchant: ${userRecord.uid}`);
    }

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    await createWallet(userRecord.uid);
    await createXenditCustomer(userRecord.uid, email, firstName, lastName, phoneNumber);

    return res.status(201).json({
      uid: userRecord.uid,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.`,
    });
  } catch (error) {
    console.error(`❌ Error adding ${role}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ✅ Add Rider
router.post("/riders/add", verifyFirebaseToken, isAdminOrEmployee, (req, res) =>
  addUser(req, res, "rider")
);

// ✅ Add Merchant (with seeded business info)
router.post("/merchants/add", verifyFirebaseToken, isAdminOrEmployee, (req, res) =>
  addUser(req, res, "merchant")
);

/**
 * ✅ Update Merchant
 */
router.put("/merchants/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await updateUser(req.params.id, req.body);
    return res.status(200).json({ message: "Merchant updated successfully." });
  } catch (error) {
    console.error("❌ Error updating merchant:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

/**
 * ✅ Delete Merchant
 */
router.delete("/merchants/:id", verifyFirebaseToken, isAdminOrEmployee, async (req, res) => {
  try {
    await deleteUser(req.params.id);
    return res.status(200).json({ message: "Merchant deleted successfully." });
  } catch (error) {
    console.error("❌ Error deleting merchant:", error);
    return res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
