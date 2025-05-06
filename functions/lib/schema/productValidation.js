"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productSchema = void 0;
const zod_1 = require("zod");
exports.productSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Product name is required"),
    category: zod_1.z.string().min(1, "Category is required"),
    price: zod_1.z.number().min(0, "Price must be a non-negative number"),
    imageUrl: zod_1.z.string().url("Image URL must be a valid URL").nullable().optional(),
    available: zod_1.z.boolean().optional().default(true),
});
//# sourceMappingURL=productValidation.js.map