import { Router, Response } from "express";
import * as admin from "firebase-admin";
import { verifyFirebaseToken, isMerchant } from "../../middleware/auth";
import { CustomRequest } from "../../types/global";
import { serviceUpdateSchema } from "../../schema/serviceValidation";

const router = Router();

/**
 * ✅ GET all services for a specific merchant
 */
router.get(
  "/:id/services",
  verifyFirebaseToken,
  isMerchant,
  async (req: CustomRequest, res: Response) => {
    try {
      const merchantId = req.params.id;

      const snapshot = await admin
        .firestore()
        .collection("businesses")
        .doc(merchantId)
        .collection("services")
        .get();

      const services = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return res.status(200).json({ services });
    } catch (err) {
      console.error("❌ Failed to fetch services:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

/**
 * ✅ PATCH /businesses/:id/services/serviceId/:name
 * Updates a service by its `name` field (Regular or Premium)
 */
router.patch(
  "/:id/services/serviceId/:name",
  verifyFirebaseToken,
  isMerchant,
  async (req: CustomRequest, res: Response) => {
    try {
      const merchantId = req.params.id;
      const name = req.params.name;

      if (!["Regular", "Premium"].includes(name)) {
        return res.status(400).json({
          error: "Invalid service name. Only 'Regular' or 'Premium' allowed.",
        });
      }

      // ✅ Validate body using Zod schema
      const parsed = serviceUpdateSchema.safeParse(req.body);

      if (!parsed.success) {
        return res.status(400).json({
          error: "Validation failed",
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const { price, inclusions, defaultDetergentId, defaultFabricConditionerId } = parsed.data;

      const businessRef = admin.firestore().collection("businesses").doc(merchantId);
      const servicesRef = businessRef.collection("services");
      const productRef = businessRef.collection("products");

      // 🔍 Find the service document by name
      const serviceSnap = await servicesRef.where("name", "==", name).limit(1).get();
      if (serviceSnap.empty) {
        return res.status(404).json({ error: `No service found with name: ${name}` });
      }

      const serviceDoc = serviceSnap.docs[0];
      const serviceId = serviceDoc.id;

      // ✅ Validate detergent/fabric IDs
      const [detergentSnap, fabricSnap] = await Promise.all([
        productRef.doc(defaultDetergentId).get(),
        productRef.doc(defaultFabricConditionerId).get(),
      ]);

      if (!detergentSnap.exists) {
        return res.status(400).json({ error: "Default detergent not found." });
      }

      if (!fabricSnap.exists) {
        return res.status(400).json({ error: "Default fabric conditioner not found." });
      }

      const now = admin.firestore.FieldValue.serverTimestamp();
      const createdAt = serviceDoc.data().createdAt || now;

      // 🔁 Update the service
      await servicesRef.doc(serviceId).set(
        {
          name,
          price,
          inclusions,
          defaultDetergentId,
          defaultFabricConditionerId,
          updatedAt: now,
          createdAt,
        },
        { merge: true }
      );

      return res.status(200).json({ message: `✅ ${name} service updated successfully.` });
    } catch (err) {
      console.error("❌ Failed to update service:", err);
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
);

export default router;
