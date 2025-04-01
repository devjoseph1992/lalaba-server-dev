import * as admin from "firebase-admin";
import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: admin.auth.DecodedIdToken; // Add user property to Request
  }
}
