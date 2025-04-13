import { z } from "zod";

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  price: z.number().min(0, "Price must be a non-negative number"),
  imageUrl: z.string().url("Image URL must be a valid URL").nullable().optional(),
  available: z.boolean().optional().default(true),
});
