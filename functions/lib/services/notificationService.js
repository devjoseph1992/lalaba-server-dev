"use strict";
// functions/src/services/notificationService.ts
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
exports.sendEmailNotification = exports.sendPushNotification = void 0;
const admin = __importStar(require("firebase-admin"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const dotenv = __importStar(require("dotenv"));
dotenv.config();
// ✅ Email Configuration (Replace with your email provider settings)
const transporter = nodemailer_1.default.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your email password
    },
});
/**
 * ✅ Send Push Notification via Firebase Cloud Messaging (FCM)
 */
const sendPushNotification = async (fcmToken, title, body) => {
    try {
        const message = {
            token: fcmToken,
            notification: {
                title,
                body,
            },
            android: {
                priority: "high",
                notification: {
                    sound: "default",
                },
            },
            apns: {
                payload: {
                    aps: {
                        alert: { title, body },
                        sound: "default",
                    },
                },
            },
        };
        await admin.messaging().send(message);
        console.log(`✅ Push Notification Sent: ${title}`);
    }
    catch (error) {
        console.error("❌ Error sending push notification:", error);
    }
};
exports.sendPushNotification = sendPushNotification;
/**
 * ✅ Send Email Notification
 */
const sendEmailNotification = async (to, subject, htmlContent) => {
    try {
        const mailOptions = {
            from: `"Your App" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html: htmlContent,
        };
        await transporter.sendMail(mailOptions);
        console.log(`✅ Email Sent to ${to}`);
    }
    catch (error) {
        console.error("❌ Error sending email:", error);
    }
};
exports.sendEmailNotification = sendEmailNotification;
//# sourceMappingURL=notificationService.js.map