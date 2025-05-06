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
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = void 0;
const crypto = __importStar(require("crypto"));
const functions = __importStar(require("firebase-functions"));
const dotenv = __importStar(require("dotenv"));
// ✅ Load .env for local development
dotenv.config();
// ✅ Load secret key from environment OR Firebase Functions config
const SECRET_KEY = process.env.WALLET_SECRET_KEY || functions.config().wallet?.secret_key;
if (!SECRET_KEY) {
    throw new Error("❌ WALLET_SECRET_KEY is missing in .env or Firebase config.");
}
// ✅ Convert secret key to a 32-byte buffer using SHA-256
const key = crypto.createHash("sha256").update(SECRET_KEY).digest();
/**
 * ✅ Encrypt Data using AES-256-CBC
 * @param text - The text to encrypt
 * @returns Encrypted string in format `${iv}:${encryptedData}`
 */
const encrypt = (text) => {
    const iv = crypto.randomBytes(16); // Generate a 16-byte IV
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`; // Return IV and ciphertext joined by ":"
};
exports.encrypt = encrypt;
/**
 * ✅ Decrypt Data using AES-256-CBC
 * @param encryptedText - The encrypted string in format `${iv}:${encryptedData}`
 * @returns Decrypted string
 */
const decrypt = (encryptedText) => {
    try {
        if (typeof encryptedText !== "string") {
            throw new Error("❌ Encrypted value must be a string.");
        }
        const [iv, encrypted] = encryptedText.split(":");
        if (!iv || !encrypted) {
            throw new Error("❌ Invalid encrypted format. Expected `${iv}:${data}`.");
        }
        const decipher = crypto.createDecipheriv("aes-256-cbc", key, Buffer.from(iv, "hex"));
        let decrypted = decipher.update(encrypted, "hex", "utf8");
        decrypted += decipher.final("utf8");
        return decrypted;
    }
    catch (error) {
        console.error("❌ Error decrypting data:", {
            input: encryptedText,
            error,
        });
        throw new Error("Decryption failed.");
    }
};
exports.decrypt = decrypt;
//# sourceMappingURL=encryption.js.map