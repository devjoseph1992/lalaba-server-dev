"use strict";
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
exports.ensureDefaultCategories = void 0;
const admin = __importStar(require("firebase-admin"));
/**
 * ✅ Automatically creates default categories if they do not exist
 * Used during business setup or category fetch
 */
async function ensureDefaultCategories(merchantId) {
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
exports.ensureDefaultCategories = ensureDefaultCategories;
//# sourceMappingURL=ensureDefaultCategories.js.map