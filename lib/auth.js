const SESSION_DURATION_HOURS = 6;
export const ADMIN_SESSION_KEY = "dest-admin-session";

export function getAdminLoginEmail() {
  return process.env.NEXT_PUBLIC_ADMIN_LOGIN_EMAIL || "admin@example.com";
}

export function getOtpSenderName() {
  return process.env.NEXT_PUBLIC_ADMIN_OTP_SENDER || "Dest Admin";
}

export function generateOtp() {
  const digits = "0123456789";
  let otp = "";
  for (let index = 0; index < 6; index += 1) {
    const randomIndex = Math.floor(Math.random() * digits.length);
    otp += digits[randomIndex];
  }
  console.log(otp)
  return otp;
}

export function persistAdminSession() {
  if (typeof window === "undefined") {
    return;
  }

  const expiresAt = Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000;
  const payload = {
    issuedAt: Date.now(),
    expiresAt,
  };

  window.localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(payload));
}

export function readAdminSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const stored = window.localStorage.getItem(ADMIN_SESSION_KEY);
  if (!stored) {
    return null;
  }

  try {
    const parsed = JSON.parse(stored);
    if (!parsed?.expiresAt || typeof parsed.expiresAt !== "number") {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    if (parsed.expiresAt <= Date.now()) {
      window.localStorage.removeItem(ADMIN_SESSION_KEY);
      return null;
    }

    return parsed;
  } catch (error) {
    console.error("Failed to parse admin session:", error);
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    return null;
  }
}

export function clearAdminSession() {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.removeItem(ADMIN_SESSION_KEY);
}
