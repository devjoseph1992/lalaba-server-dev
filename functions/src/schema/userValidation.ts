// functions/src/schema/userValidation.ts

import { z } from "zod";

const baseSchema = z.object({
  role: z.enum(["rider", "merchant", "employee"]),
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z
    .string()
    .min(10, "Phone number must have at least 10 digits")
    .max(13, "Invalid phone number format"),
  address: z.string().min(5, "Address must be at least 5 characters long"),
  tinNumber: z.string().min(1, "TIN number is required"),
});

// ✅ Rider Schema (Requires Barangay Clearance, SSS, PhilHealth)
const riderSchema = baseSchema.extend({
  role: z.literal("rider"),
  sssNumber: z.string().min(1, "SSS number is required"), // ✅ Only for riders
  philhealthNumber: z.string().min(1, "PhilHealth number is required"), // ✅ Only for riders
  driverLicenseNumber: z.string().min(1, "Driver's license number is required"),
  plateNumber: z.string().min(1, "Plate number is required"),
  vehicleUnit: z.string().min(1, "Vehicle unit is required"),
  barangayClearance: z.string().min(1, "Barangay clearance is required"), // ✅ Only for riders
});

// ✅ Merchant Schema (No SSS, No PhilHealth, No Barangay Clearance)
const merchantSchema = baseSchema.extend({
  role: z.literal("merchant"),
  businessName: z.string().min(1, "Business name is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  businessPermit: z.string().min(1, "Business permit is required"),
});

// ✅ Employee Schema (Requires Barangay Clearance, SSS, PhilHealth)
const employeeSchema = baseSchema.extend({
  role: z.literal("employee"),
  sssNumber: z.string().min(1, "SSS number is required"), // ✅ Only for employees
  philhealthNumber: z.string().min(1, "PhilHealth number is required"), // ✅ Only for employees
  jobTitle: z.string().min(1, "Job title is required"),
  department: z.string().min(1, "Department is required"),
  employeeId: z.string().min(1, "Employee ID is required"),
  employmentStatus: z
    .enum(["full-time", "part-time", "contract"])
    .default("full-time"),
  barangayClearance: z.string().min(1, "Barangay clearance is required"), // ✅ Only for employees
});

// ✅ Ensure correct validation based on role
export const userSchema = z.discriminatedUnion("role", [
  riderSchema, // 🏍 Riders require barangay clearance, SSS, and PhilHealth
  merchantSchema, // 🏪 Merchants do NOT require barangay clearance, SSS, or PhilHealth
  employeeSchema, // 👨‍💼 Employees require barangay clearance, SSS, and PhilHealth
]);
