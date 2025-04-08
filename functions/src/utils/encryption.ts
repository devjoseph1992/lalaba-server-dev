import * as crypto from "crypto";
import * as functions from "firebase-functions";

// ✅ Load secret key from Firebase Functions config
const SECRET_KEY = functions.config().wallet.secret_key;

if (!SECRET_KEY) {
  throw new Error("❌ WALLET_SECRET_KEY is missing in Firebase config.");
}

// ✅ Convert secret key to a 32-byte buffer using SHA-256
const key = crypto.createHash("sha256").update(SECRET_KEY).digest();

/**
 * ✅ Encrypt Data using AES-256-CBC
 * @param text - The text to encrypt
 * @returns Encrypted string in format `${iv}:${encryptedData}`
 */
export const encrypt = (text: string): string => {
  const iv = crypto.randomBytes(16); // Generate a 16-byte IV
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  return `${iv.toString("hex")}:${encrypted}`; // Return IV and ciphertext joined by ":"
};

/**
 * ✅ Decrypt Data using AES-256-CBC
 * @param encryptedText - The encrypted string in format `${iv}:${encryptedData}`
 * @returns Decrypted string
 */
export const decrypt = (encryptedText: string): string => {
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
  } catch (error) {
    console.error("❌ Error decrypting data:", {
      input: encryptedText,
      error,
    });
    throw new Error("Decryption failed.");
  }
};
