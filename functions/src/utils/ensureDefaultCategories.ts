import * as admin from "firebase-admin";

/**
 * ✅ Automatically creates default categories if they do not exist
 * Used during business setup or category fetch
 */
export async function ensureDefaultCategories(merchantId: string): Promise<void> {
  const db = admin.firestore();
  const categoriesRef = db.collection("businesses").doc(merchantId).collection("categories");

  const defaultCategories = [
    {
      name: "Detergent",
      icon: "🧼",
      sortOrder: 1,
    },
    {
      name: "Fabric Conditioner",
      icon: "🧴",
      sortOrder: 2,
    },
  ];

  for (const category of defaultCategories) {
    const existing = await categoriesRef.where("name", "==", category.name).limit(1).get();

    if (existing.empty) {
      await categoriesRef.doc().set({
        ...category,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`🛠️ Created missing default category: ${category.name}`);
    }
  }
}
