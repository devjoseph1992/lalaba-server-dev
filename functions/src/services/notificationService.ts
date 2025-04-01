// functions/src/services/notificationService.ts

import * as admin from "firebase-admin";
import nodemailer from "nodemailer";
import * as dotenv from "dotenv";

dotenv.config();

// ✅ Email Configuration (Replace with your email provider settings)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password
  },
});

/**
 * ✅ Send Push Notification via Firebase Cloud Messaging (FCM)
 */
export const sendPushNotification = async (
  fcmToken: string,
  title: string,
  body: string
) => {
  try {
    const message: admin.messaging.Message = {
      token: fcmToken,
      notification: {
        title,
        body,
      },
      android: {
        priority: "high" as const, // ✅ Explicitly set as "high"
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
  } catch (error) {
    console.error("❌ Error sending push notification:", error);
  }
};

/**
 * ✅ Send Email Notification
 */
export const sendEmailNotification = async (
  to: string,
  subject: string,
  htmlContent: string
) => {
  try {
    const mailOptions = {
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: htmlContent,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email Sent to ${to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};
