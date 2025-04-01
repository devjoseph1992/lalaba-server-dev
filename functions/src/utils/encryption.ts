// functions/src/utils/encryption.ts

import * as crypto from "crypto";
import * as dotenv from "dotenv";

dotenv.config();

// ✅ Load secret key from environment variables
const SECRET_KEY = process.env.WALLET_SECRET_KEY;

if (!SECRET_KEY) {
  throw new Error("❌ WALLET_SECRET_KEY is missing in environment variables.");
}

// ✅ Convert secret key to a 32-byte buffer
const key = crypto.createHash("sha256").update(SECRET_KEY).digest();

/**
 * ✅ Encrypt Data using AES-256-CBC
 * @param text - The text to encrypt
 * @returns Encrypted string in format `${iv}:${encryptedData}`
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16); // Generate a random IV
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`; // Store IV with encrypted data
};

/**
 * ✅ Decrypt Data using AES-256-CBC
 * @param encryptedText - The encrypted text in `${iv}:${encryptedData}` format
 * @returns Decrypted string
 */
export const decrypt = (encryptedText: string): string => {
  try {
    const [iv, encrypted] = encryptedText.split(":"); // Extract IV and encrypted data
    if (!iv || !encrypted) throw new Error("❌ Invalid encrypted format.");

    const decipher = crypto.createDecipheriv(
      "aes-256-cbc",
      key,
      Buffer.from(iv, "hex")
    );
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("❌ Error decrypting data:", error);
    throw new Error("Decryption failed.");
  }
};
