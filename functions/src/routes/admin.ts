// functions/src/routes/admin.ts

import { Router } from "express";
import * as admin from "firebase-admin";
import { getUsersByRole, updateUser, deleteUser } from "../utils/firestore";
import { verifyFirebaseToken, isAdmin } from "../middleware/auth";
import { createXenditCustomer } from "../services/xenditService";
import { createWallet } from "../services/walletService";
import { userSchema } from "../schema/userValidation";

import z from "zod";

const router = Router();

/**
 * ✅ Utility function for pagination
 */
const paginateResults = (users: any[], page: number, limit: number) => {
  const startIndex = (page - 1) * limit;
  const paginatedUsers = users.slice(startIndex, startIndex + limit);

  return {
    users: paginatedUsers,
    pagination: {
      total: users.length,
      page,
      limit,
      totalPages: Math.ceil(users.length / limit),
      hasNextPage: startIndex + limit < users.length,
      hasPrevPage: startIndex > 0,
    },
  };
};

/**
 * ✅ Get Users by Role (Admins Only) + Search Functionality
 */
router.get("/role/:role", verifyFirebaseToken, async (req, res) => {
  try {
    const { role } = req.params;
    const { page = 1, limit = 10, search = "" } = req.query as any;
    const userRole = req.user?.role; // Get the role from Firebase Token

    // ✅ Employees can only access "rider" and "merchant"
    if (userRole === "employee" && role !== "rider" && role !== "merchant") {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    // ✅ Admins can access everything
    if (userRole === "admin" || userRole === "employee") {
      const users = await getUsersByRole(role);

      if (search) {
        users.users = users.users.filter((user: any) =>
          Object.values(user)
            .join(" ")
            .toLowerCase()
            .includes(search.toLowerCase())
        );
      }

      return res.status(200).json(paginateResults(users.users, page, limit));
    }

    // ❌ If role is unknown, deny access
    return res.status(403).json({ error: "Unauthorized role access." });
  } catch (error) {
    console.error("❌ Error fetching users:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

/**
 * ✅ Get Employees with Pagination
 */
router.get("/employees", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const employees = await getUsersByRole("employee");

    return res.status(200).json(paginateResults(employees.users, page, limit));
  } catch (error) {
    console.error("❌ Error fetching employees:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

/**
 * ✅ Get Riders with Pagination
 */
router.get("/riders", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const riders = await getUsersByRole("rider");

    return res.status(200).json(paginateResults(riders.users, page, limit));
  } catch (error) {
    console.error("❌ Error fetching riders:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

/**
 * ✅ Get Merchants with Pagination
 */
router.get("/merchants", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query as any;
    const merchants = await getUsersByRole("merchant");

    return res.status(200).json(paginateResults(merchants.users, page, limit));
  } catch (error) {
    console.error("❌ Error fetching merchants:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

/**
 * ✅ Add a New User (Admins Can Add Employees, Riders & Merchants)
 */
router.post("/add", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    // ✅ Validate request body with Zod
    const validatedData = userSchema.parse(req.body);

    const {
      role,
      email,
      password,
      firstName,
      lastName,
      phoneNumber,
      address,
      tinNumber,
    } = validatedData;

    const createdBy = req.user?.uid;

    // ✅ Check if `employeeId` already exists (only for employees)
    let employeeId = "";
    if (role === "employee") {
      employeeId = (validatedData as { employeeId: string }).employeeId;

      const existingEmployee = await admin
        .firestore()
        .collection("users")
        .where("employeeId", "==", employeeId)
        .get();

      if (!existingEmployee.empty) {
        return res.status(400).json({
          error: "❌ Validation Failed",
          details: [
            { path: ["employeeId"], message: "Employee ID already exists." },
          ],
        });
      }
    }

    // ✅ Create Firebase Auth User
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
      tinNumber,
      role,
      createdBy,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // ✅ Handle Role-Specific Fields Explicitly
    if (role === "rider") {
      const {
        driverLicenseNumber,
        plateNumber,
        vehicleUnit,
        barangayClearance,
        sssNumber,
        philhealthNumber,
      } = validatedData as {
        driverLicenseNumber: string;
        plateNumber: string;
        vehicleUnit: string;
        barangayClearance: string;
        sssNumber: string;
        philhealthNumber: string;
      };

      userData = {
        ...userData,
        driverLicenseNumber,
        plateNumber,
        vehicleUnit,
        barangayClearance, // ✅ Riders require barangay clearance
        sssNumber, // ✅ Only for riders
        philhealthNumber, // ✅ Only for riders
      };
    } else if (role === "merchant") {
      const { businessName, businessAddress, businessPermit } =
        validatedData as {
          businessName: string;
          businessAddress: string;
          businessPermit: string;
        };

      userData = {
        ...userData,
        businessName,
        businessAddress,
        businessPermit,
      };

      // ❌ Do NOT include barangayClearance, sssNumber, or philhealthNumber for merchants
    } else if (role === "employee") {
      const {
        jobTitle,
        department,
        employmentStatus,
        barangayClearance,
        sssNumber,
        philhealthNumber,
      } = validatedData as {
        jobTitle: string;
        department: string;
        employmentStatus: string;
        barangayClearance: string;
        sssNumber: string;
        philhealthNumber: string;
      };

      userData = {
        ...userData,
        jobTitle,
        department,
        employeeId, // ✅ Ensure employeeId is correctly assigned
        employmentStatus,
        barangayClearance, // ✅ Employees require barangay clearance
        sssNumber, // ✅ Only for employees
        philhealthNumber, // ✅ Only for employees
      };
    }

    // ✅ Save user data to Firestore
    await admin
      .firestore()
      .collection("users")
      .doc(userRecord.uid)
      .set(userData);

    // ✅ Create a Wallet for Riders & Merchants
    if (role === "rider" || role === "merchant") {
      try {
        await createWallet(userRecord.uid);
        console.log(`✅ Wallet created for ${role}: ${userRecord.uid}`);
      } catch (error) {
        console.error(`❌ Error creating wallet for ${role}:`, error);
      }
    }

    // ✅ Create a Customer in Xendit (Only for Riders & Merchants)
    if (role === "rider" || role === "merchant") {
      try {
        const customer = await createXenditCustomer(
          userRecord.uid,
          email,
          firstName,
          lastName,
          phoneNumber
        );

        // ✅ Store the Xendit Customer ID inside Firestore
        await admin.firestore().collection("users").doc(userRecord.uid).update({
          xenditCustomerId: customer.id,
          xenditReferenceId: customer.reference_id,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Xendit Customer linked for ${role}: ${userRecord.uid}`);
      } catch (error) {
        console.error(`❌ Error linking Xendit customer for ${role}:`, error);
      }
    }

    return res.status(201).json({
      uid: userRecord.uid,
      message: `${role} added successfully.`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: "❌ Validation Failed",
        details: error.errors,
      });
    }
    console.error("❌ Error adding user:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
});

/**
 * ✅ Update User Details (Admins Can Update Any User)
 */
router.put("/update/:uid", verifyFirebaseToken, isAdmin, async (req, res) => {
  try {
    await updateUser(req.params.uid, req.body);

    if (req.body.email || req.body.password) {
      await admin.auth().updateUser(req.params.uid, {
        email: req.body.email || undefined,
        password: req.body.password || undefined,
      });
    }

    return res.status(200).json({ message: "User updated successfully." });
  } catch (error) {
    console.error("❌ Error updating user:", error);
    return res.status(500).json({ error: (error as any).message });
  }
});

/**
 * ✅ Delete a User (Admins Can Delete Users)
 */
router.delete(
  "/delete/:uid",
  verifyFirebaseToken,
  isAdmin,
  async (req, res) => {
    try {
      if (req.user && req.user.uid === req.params.uid) {
        return res.status(403).json({ error: "You cannot delete yourself." });
      }

      await deleteUser(req.params.uid);
      await admin.auth().deleteUser(req.params.uid);
      return res.status(200).json({ message: "User deleted successfully." });
    } catch (error) {
      console.error("❌ Error deleting user:", error);
      return res.status(500).json({ error: (error as any).message });
    }
  }
);

export default router;
