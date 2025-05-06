"use strict";
// functions/src/schema/userValidation.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSchema = void 0;
const zod_1 = require("zod");
const baseSchema = zod_1.z.object({
    role: zod_1.z.enum(["rider", "merchant", "employee"]),
    email: zod_1.z.string().email("Invalid email format"),
    password: zod_1.z.string().min(6, "Password must be at least 6 characters long"),
    firstName: zod_1.z.string().min(1, "First name is required"),
    lastName: zod_1.z.string().min(1, "Last name is required"),
    phoneNumber: zod_1.z
        .string()
        .min(10, "Phone number must have at least 10 digits")
        .max(13, "Invalid phone number format"),
    address: zod_1.z.string().min(5, "Address must be at least 5 characters long"),
    tinNumber: zod_1.z.string().min(1, "TIN number is required"),
});
// ✅ Rider Schema (Requires Barangay Clearance, SSS, PhilHealth)
const riderSchema = baseSchema.extend({
    role: zod_1.z.literal("rider"),
    sssNumber: zod_1.z.string().min(1, "SSS number is required"),
    philhealthNumber: zod_1.z.string().min(1, "PhilHealth number is required"),
    driverLicenseNumber: zod_1.z.string().min(1, "Driver's license number is required"),
    plateNumber: zod_1.z.string().min(1, "Plate number is required"),
    vehicleUnit: zod_1.z.string().min(1, "Vehicle unit is required"),
    barangayClearance: zod_1.z.string().min(1, "Barangay clearance is required"), // ✅ Only for riders
});
// ✅ Merchant Schema (No SSS, No PhilHealth, No Barangay Clearance)
const merchantSchema = baseSchema.extend({
    role: zod_1.z.literal("merchant"),
    businessName: zod_1.z.string().min(1, "Business name is required"),
    businessAddress: zod_1.z.string().min(1, "Business address is required"),
    businessPermit: zod_1.z.string().min(1, "Business permit is required"),
});
// ✅ Employee Schema (Requires Barangay Clearance, SSS, PhilHealth)
const employeeSchema = baseSchema.extend({
    role: zod_1.z.literal("employee"),
    sssNumber: zod_1.z.string().min(1, "SSS number is required"),
    philhealthNumber: zod_1.z.string().min(1, "PhilHealth number is required"),
    jobTitle: zod_1.z.string().min(1, "Job title is required"),
    department: zod_1.z.string().min(1, "Department is required"),
    employeeId: zod_1.z.string().min(1, "Employee ID is required"),
    employmentStatus: zod_1.z.enum(["full-time", "part-time", "contract"]).default("full-time"),
    barangayClearance: zod_1.z.string().min(1, "Barangay clearance is required"), // ✅ Only for employees
});
// ✅ Ensure correct validation based on role
exports.userSchema = zod_1.z.discriminatedUnion("role", [
    riderSchema,
    merchantSchema,
    employeeSchema, // 👨‍💼 Employees require barangay clearance, SSS, and PhilHealth
]);
//# sourceMappingURL=userValidation.js.map