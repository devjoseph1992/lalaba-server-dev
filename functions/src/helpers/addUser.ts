import * as admin from "firebase-admin";
import { Request, Response } from "express";
import { createWallet } from "../services/walletService";
import { createXenditCustomer } from "../services/xenditService";
import { ensureDefaultCategories } from "../utils/ensureDefaultCategories";
import { createDefaultServices } from "../utils/createDefaultServices";

export const addUser = async (req: Request, res: Response, role: "rider" | "merchant") => {
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
    }

    if (role === "merchant") {
      const { businessName, businessAddress } = req.body;
      userData = { ...userData, businessName, businessAddress };

      await admin.firestore().collection("businesses").doc(userRecord.uid).set({
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        status: false,
      });

      await ensureDefaultCategories(userRecord.uid);
      await createDefaultServices(userRecord.uid);
    }

    await admin.firestore().collection("users").doc(userRecord.uid).set(userData);
    await createWallet(userRecord.uid);
    await createXenditCustomer(userRecord.uid, email, firstName, lastName, phoneNumber);

    res.status(201).json({
      uid: userRecord.uid,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} added successfully.`,
    });
  } catch (error) {
    console.error(`❌ Error adding ${role}:`, error);
    res.status(500).json({ error: (error as Error).message });
  }
};
