import { Request } from "express";
import { DecodedIdToken } from "firebase-admin/auth";

/**
 * ✅ CustomRequest adds the decoded Firebase token + optional role
 */
export interface CustomRequest extends Request {
  user?: DecodedIdToken & { role?: string };
}
