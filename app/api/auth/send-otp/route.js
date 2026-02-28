import nodemailer from "nodemailer";
import { NextResponse } from "next/server";

import { getAdminLoginEmail, getOtpSenderName } from "@/lib/auth";

function isEmailConfigured() {
  return (
    process.env.EMAIL_HOST &&
    process.env.EMAIL_PORT &&
    process.env.EMAIL_USER &&
    process.env.EMAIL_PASS &&
    process.env.EMAIL_FROM
  );
}

function buildTransporter() {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: process.env.EMAIL_PORT === "465",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

async function dispatchEmail(otp, emails) {
  if (!isEmailConfigured()) {
    console.info(
      "Email transport not configured. OTP for developer reference:",
      otp,
    );
    return;
  }

  const transporter = buildTransporter();
  // Support array of emails or single email string
  const recipients = Array.isArray(emails) ? emails.join(",") : emails;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject: `Your ${getOtpSenderName()} verification code`,
    text: `Use ${otp} to complete your Dest admin login. This code expires in 2 minutes.`,
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;padding:20px 0;"><table role="presentation" style="max-width:400px;margin:0 auto;background:#fff;border-radius:20px;padding:24px;"><tr><td style="text-align:center;"><h1 style="margin:0 0 12px;font-size:22px;letter-spacing:0.2px;color:#1f2937;">${getOtpSenderName()}</h1><p style="margin:0 0 24px;font-size:14px;color:#4b5563;">Enter the code below to access the Dest admin dashboard. It expires in 2 minutes.</p><div style="width:calc(100% - 48px);gap:12px;font-size:28px;font-weight:700;letter-spacing:8px;background:#f3f4f6;border-radius:14px;padding:18px 24px;color:#111827;text-align:center;">${otp}</div><p style="margin:24px 0 0;font-size:12px;color:#6b7280;">If you did not request this code you can ignore or delete this email.</p></td></tr></table></body></html>`,
  });
}

export async function POST(request) {
  try {
    const { otp } = await request.json();
    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { success: false, error: "Missing OTP" },
        { status: 400 },
      );
    }

    const emails = getAdminLoginEmail();
    await dispatchEmail(otp, emails);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to send admin OTP:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to send OTP",
        detail: error?.cause?.message ?? error?.message ?? "",
      },
      { status: 500 },
    );
  }
}
