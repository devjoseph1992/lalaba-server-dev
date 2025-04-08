import * as admin from "firebase-admin";
import "express"; // Ensure this is imported to augment types

declare module "express-serve-static-core" {
  interface Request {
    user?: admin.auth.DecodedIdToken & { role?: string };
  }
}
