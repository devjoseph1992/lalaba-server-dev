"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serviceUpdateSchema = exports.serviceNameSchema = void 0;
const zod_1 = require("zod");
/**
 * Only "Regular" and "Premium" are allowed names
 */
exports.serviceNameSchema = zod_1.z.enum(["Regular", "Premium"], {
    required_error: "Service name is required",
});
/**
 * Schema for updating or creating a service (Regular or Premium)
 */
exports.serviceUpdateSchema = zod_1.z.object({
    name: exports.serviceNameSchema,
    price: zod_1.z
        .number({ required_error: "Price is required" })
        .min(0, "Price must be a positive number"),
    inclusions: zod_1.z.array(zod_1.z.string()).default([]),
    defaultDetergentId: zod_1.z
        .string({ required_error: "Detergent product ID is required" })
        .min(1, "Default detergent ID must be provided"),
    defaultDetergentName: zod_1.z
        .string({ required_error: "Detergent product name is required" })
        .min(1, "Detergent name must be provided"),
    detergentPerKilo: zod_1.z
        .number({ required_error: "Detergent per kilo is required" })
        .min(0.1, "Detergent quantity per kilo must be greater than 0"),
    defaultFabricConditionerId: zod_1.z
        .string({ required_error: "Fabric conditioner product ID is required" })
        .min(1, "Fabric conditioner ID must be provided"),
    defaultFabricConditionerName: zod_1.z
        .string({ required_error: "Fabric conditioner name is required" })
        .min(1, "Fabric conditioner name must be provided"),
    fabricPerKilo: zod_1.z
        .number({ required_error: "Fabric conditioner per kilo is required" })
        .min(0.1, "Fabric conditioner quantity per kilo must be greater than 0"),
});
//# sourceMappingURL=serviceValidation.js.map