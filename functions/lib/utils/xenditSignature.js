"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyXenditSignature = void 0;
// utils/xenditSignature.ts
const crypto_1 = __importDefault(require("crypto"));
const verifyXenditSignature = (rawBody, receivedSignature, secret) => {
    const computedSignature = crypto_1.default.createHmac("sha256", secret).update(rawBody).digest("hex");
    return computedSignature === receivedSignature;
};
exports.verifyXenditSignature = verifyXenditSignature;
//# sourceMappingURL=xenditSignature.js.map