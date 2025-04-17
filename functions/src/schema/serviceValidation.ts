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
  name: serviceNameSchema,

  price: z
    .number({ required_error: "Price is required" })
    .min(0, "Price must be a positive number"),

  inclusions: z.array(z.string()).default([]),

  defaultDetergentId: z
    .string({ required_error: "Detergent product ID is required" })
    .min(1, "Default detergent ID must be provided"),

  defaultDetergentName: z
    .string({ required_error: "Detergent product name is required" })
    .min(1, "Detergent name must be provided"),

  detergentPerKilo: z
    .number({ required_error: "Detergent per kilo is required" })
    .min(0.1, "Detergent quantity per kilo must be greater than 0"),

  defaultFabricConditionerId: z
    .string({ required_error: "Fabric conditioner product ID is required" })
    .min(1, "Fabric conditioner ID must be provided"),

  defaultFabricConditionerName: z
    .string({ required_error: "Fabric conditioner name is required" })
    .min(1, "Fabric conditioner name must be provided"),

  fabricPerKilo: z
    .number({ required_error: "Fabric conditioner per kilo is required" })
    .min(0.1, "Fabric conditioner quantity per kilo must be greater than 0"),
});
