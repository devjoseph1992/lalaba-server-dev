"use strict";
// functions/src/schema/businessSetupSchema.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessSetupSchema = void 0;
const zod_1 = require("zod");
exports.businessSetupSchema = zod_1.z.object({
    businessName: zod_1.z.string().min(1, "Business name is required"),
    barangay: zod_1.z.string().min(1, "Barangay is required"),
    city: zod_1.z.string().min(1, "City is required"),
    exactAddress: zod_1.z.string().min(1, "Exact address is required"),
    coordinates: zod_1.z.object({
        lat: zod_1.z.number().min(-90).max(90),
        lng: zod_1.z.number().min(-180).max(180),
    }),
    imageUrl: zod_1.z.string().url("Invalid image URL").optional().nullable(),
    phoneNumber: zod_1.z
        .string()
        .min(10, "Phone number must be at least 10 digits")
        .max(13, "Phone number too long"),
    openingHours: zod_1.z.object({
        open: zod_1.z.string().min(1, "Opening time is required"),
        close: zod_1.z.string().min(1, "Closing time is required"),
    }),
    orderTypeDelivery: zod_1.z.boolean({
        required_error: "orderTypeDelivery is required",
        invalid_type_error: "orderTypeDelivery must be a boolean",
    }),
    status: zod_1.z.boolean().optional().default(false),
    // ✅ NEW FIELD
    description: zod_1.z.string().max(1000, "Description must be 1000 characters or less").optional(),
});
//# sourceMappingURL=businessValidation.js.map