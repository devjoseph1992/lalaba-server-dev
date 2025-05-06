// utils/xenditSignature.ts
import crypto from "crypto";

export const verifyXenditSignature = (
  rawBody: string,
  receivedSignature: string,
  secret: string
): boolean => {
  const computedSignature = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");

  return computedSignature === receivedSignature;
};
