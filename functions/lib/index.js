"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const functions = __importStar(require("firebase-functions/v1"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const admin_1 = __importDefault(require("./routes/admin"));
const employee_1 = __importDefault(require("./routes/employee"));
const xenditWebhook_1 = __importDefault(require("./routes/xenditWebhook"));
const wallet_1 = __importDefault(require("./routes/wallet"));
const rider_1 = __importDefault(require("./routes/rider"));
const orders_1 = __importDefault(require("./routes/orders"));
const businesses_1 = __importDefault(require("./routes/businesses"));
const customers_1 = __importDefault(require("./routes/customers"));
const payments_1 = __importDefault(require("./routes/payments"));
const xenditInvoiceWebhook_1 = __importDefault(require("./routes/xenditInvoiceWebhook"));
const dotenv_1 = __importDefault(require("dotenv"));
// Load environment variables
dotenv_1.default.config();
// ✅ Initialize Express App
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// ✅ Define Routes
app.use("/admin", admin_1.default);
app.use("/employees", employee_1.default);
app.use("/xendit", xenditWebhook_1.default);
app.use("/wallet", wallet_1.default);
app.use("/rider", rider_1.default);
app.use("/orders", orders_1.default);
app.use("/businesses", businesses_1.default);
app.use("/customers", customers_1.default);
app.use("/payments", payments_1.default);
app.use("/xenditWebhook", xenditInvoiceWebhook_1.default);
// ✅ Health Check Route (Fix for Cloud Run Healthcheck Failures)
app.get("/", (req, res) => {
    res.status(200).send("API is running successfully!");
});
// ✅ Force Deployment as GCFv2
exports.api = functions.https.onRequest(app); // ✅ Forces GCFv2 deployment
//# sourceMappingURL=index.js.map