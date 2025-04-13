import { z } from "zod";

/**
 * Only "Regular" and "Premium" are allowed names
 */
export const serviceNameSchema = z.enum(["Regular", "Premium"], {
  required_error: "Service name is required",
});

/**
 * Schema for updating or creating a service (Regular or Premium)
 */
export const serviceUpdateSchema = z.object({
  name: serviceNameSchema, // ✅ Use "name" instead of "type"

  price: z
    .number({ required_error: "Price is required" })
    .min(0, "Price must be a positive number"),

  inclusions: z.array(z.string()).default([]),

  defaultDetergentId: z
    .string({ required_error: "Detergent product ID is required" })
    .min(1, "Default detergent ID must be provided"),

  defaultFabricConditionerId: z
    .string({ required_error: "Fabric conditioner product ID is required" })
    .min(1, "Default fabric conditioner ID must be provided"),
});
