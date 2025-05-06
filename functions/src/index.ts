import * as functions from "firebase-functions/v1";
import express from "express";
import cors from "cors";
import adminRoutes from "./routes/admin";

import employeeRoutes from "./routes/employee";

import webhookRoutes from "./routes/xenditWebhook";

import walletRoutes from "./routes/wallet";

import riderRoutes from "./routes/rider";

import orderRoutes from "./routes/orders";

import businessesRoutes from "./routes/businesses";

import CustomersBusinessRoutes from "./routes/customers";
import PaymentsRoutes from "./routes/payments";
import xenditWebhookRoutes from "./routes/xenditInvoiceWebhook";

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

// ✅ Initialize Express App
const app = express();
app.use(cors());
app.use(express.json());

// ✅ Define Routes
app.use("/admin", adminRoutes);
app.use("/employees", employeeRoutes);
app.use("/xendit", webhookRoutes);
app.use("/wallet", walletRoutes);
app.use("/rider", riderRoutes);
app.use("/orders", orderRoutes);
app.use("/businesses", businessesRoutes);
app.use("/customers", CustomersBusinessRoutes);
app.use("/payments", PaymentsRoutes);
app.use("/xenditWebhook", xenditWebhookRoutes);

// ✅ Health Check Route (Fix for Cloud Run Healthcheck Failures)
app.get("/", (req, res) => {
  res.status(200).send("API is running successfully!");
});

// ✅ Force Deployment as GCFv2
export const api = functions.https.onRequest(app); // ✅ Forces GCFv2 deployment
