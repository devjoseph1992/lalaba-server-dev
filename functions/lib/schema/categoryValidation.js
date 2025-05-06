"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categorySchema = void 0;
const zod_1 = require("zod");
exports.categorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Category name is required"),
    icon: zod_1.z.string().min(1, "Icon is required"),
    sortOrder: zod_1.z.number().int().min(0),
});
//# sourceMappingURL=categoryValidation.js.map