// routes/admin/addUser.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isAdmin } from "../../middleware/auth";
import { createWallet } from "../../services/walletService";
import { createXenditCustomer } from "../../services/xenditService";
import { ensureDefaultCategories } from "../../utils/ensureDefaultCategories";
import { createDefaultServices } from "../../utils/createDefaultServices";
import { userSchema } from "../../schema/userValidation";
import z from "zod";

const router = Router();

router.post("/add", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    const { role, email, password, firstName, lastName, phoneNumber, address, tinNumber } =
      validatedData;

    const createdBy = req.user?.uid;
    let userData: any = {
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      tinNumber,
      role,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // 🔐 Create Firebase Auth user
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: `${firstName} ${lastName}`,
    });
    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    // 👤 EMPLOYEE logic
    if (role === "employee") {
      const {
        employeeId,
        jobTitle,
        department,
        employmentStatus,
        barangayClearance,
        sssNumber,
        philhealthNumber,
      } = validatedData as any;

      // Ensure employeeId is unique
      const existing = await admin
        .firestore()
        .collection("users")
        .where("employeeId", "==", employeeId)
        .get();

      if (!existing.empty) {
        return res.status(400).json({
          error: "❌ Validation Failed",
          details: [{ path: ["employeeId"], message: "Employee ID already exists." }],
        });
      }

      userData = {
        ...userData,
        employeeId,
        jobTitle,
        department,
        employmentStatus,
        barangayClearance,
        sssNumber,
        philhealthNumber,
      };
    }

    // 🛵 RIDER logic
    if (role === "rider") {
      const {
        driverLicenseNumber,
        plateNumber,
        vehicleUnit,
        barangayClearance,
        sssNumber,
        philhealthNumber,
      } = validatedData as any;

      userData = {
        ...userData,
        driverLicenseNumber,
        plateNumber,
        vehicleUnit,
        barangayClearance,
        sssNumber,
        philhealthNumber,
        averageRating: 0,
        ratingCount: 0,
      };

      await createWallet(userRecord.uid);
    }

    // 🏢 MERCHANT logic
    if (role === "merchant") {
      const { businessName, businessAddress, businessPermit } = validatedData as any;

      userData = {
        ...userData,
        businessName,
        businessAddress,
        businessPermit,
      };

      // Create business root doc
      const businessRef = admin.firestore().collection("businesses").doc(userRecord.uid);
      await businessRef.set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        merchantId: userRecord.uid,
        status: true,
      });

      await ensureDefaultCategories(userRecord.uid);
      await createDefaultServices(userRecord.uid);
      await createWallet(userRecord.uid);
    }

    // ✅ Save user profile
    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);

    // 💸 Link to Xendit
    if (role === "rider" || role === "merchant") {
      const customer = await createXenditCustomer(
        userRecord.uid,
        email,
        firstName,
        lastName,
        phoneNumber
      );

      await admin.firestore().collection("users").doc(userRecord.uid).update({
        xenditCustomerId: customer.id,
        xenditReferenceId: customer.reference_id,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.status(201).json({
      uid: userRecord.uid,
      message: `✅ ${role} added successfully.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "❌ Validation Failed", details: error.errors });
    }
    console.error("❌ Error adding user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;
