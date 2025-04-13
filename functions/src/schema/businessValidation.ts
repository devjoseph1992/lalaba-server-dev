// functions/src/schema/businessSetupSchema.ts

import { z } from "zod";

export const businessSetupSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  barangay: z.string().min(1, "Barangay is required"),
  city: z.string().min(1, "City is required"),
  exactAddress: z.string().min(1, "Exact address is required"),

  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),

  imageUrl: z.string().url("Invalid image URL").optional().nullable(),

  phoneNumber: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(13, "Phone number too long"),

  openingHours: z.object({
    open: z.string().min(1, "Opening time is required"),
    close: z.string().min(1, "Closing time is required"),
  }),

  orderTypeDelivery: z.boolean({
    required_error: "orderTypeDelivery is required",
    invalid_type_error: "orderTypeDelivery must be a boolean",
  }),

  status: z.boolean().optional().default(false), // ✅ Setup completion status
});
