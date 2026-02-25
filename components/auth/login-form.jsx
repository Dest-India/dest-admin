"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Loader } from "@/components/ui/loader";
import {
  generateOtp,
  getOtpSenderName,
  persistAdminSession,
  readAdminSession,
} from "@/lib/auth";
import { Label } from "../ui/label";

const senderName = getOtpSenderName();
const initialCountdown = 120;

export function LoginForm() {
  const router = useRouter();
  const otpInput = useRef(null);
  const [phase, setPhase] = useState("idle");
  const [otpValue, setOtpValue] = useState("");
  const [issuedOtp, setIssuedOtp] = useState("");
  const [remaining, setRemaining] = useState(initialCountdown);
  const [checkingSession, setCheckingSession] = useState(true);

  const isLoading = phase === "pending" || phase === "verifying";
  const showOtpInputs = issuedOtp.length === 6;
  const allowResend = showOtpInputs && remaining === 0;
  const sendDisabled = checkingSession || isLoading;

  useEffect(() => {
    const session = readAdminSession();
    if (session) {
      router.replace("/dashboard");
      return;
    }
    setCheckingSession(false);
  }, [router]);

  useEffect(() => {
    if (!showOtpInputs || remaining <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setRemaining((value) => Math.max(0, value - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [showOtpInputs, remaining]);

  const formattedCountdown = useMemo(() => {
    const minutes = Math.floor(remaining / 60)
      .toString()
      .padStart(2, "0");
    const seconds = (remaining % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }, [remaining]);

  const handleSendOtp = useCallback(async () => {
    try {
      setPhase("pending");
      const generated = generateOtp();
      setOtpValue("");

      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otp: generated }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      setIssuedOtp(generated);
      setPhase("sent");
      setRemaining(initialCountdown);
      toast.success("OTP dispatched to your registered email.");
      
      setTimeout(() => {
        otpInput.current?.focus();
      }, 100);
    } catch (error) {
      console.error("Failed to send admin OTP", error);
      setPhase("idle");
      setIssuedOtp("");
      toast.error("Unable to send OTP. Check email configuration.");
    }
  }, []);

  const handleVerifyOtp = useCallback(() => {
    if (issuedOtp.length !== 6) {
      toast.error("Request a new OTP first");
      return;
    }

    const trimmedValue = otpValue.trim();
    if (trimmedValue.length !== 6) {
      toast.error("Enter the 6 digit OTP");
      return;
    }

    if (remaining === 0) {
      toast.error("OTP expired. Request a new code.");
      return;
    }

    if (trimmedValue !== issuedOtp) {
      toast.error("Invalid OTP. Please try again.");
      return;
    }

    setPhase("verifying");
    persistAdminSession();
    toast.success("Authenticated successfully !!");
    router.replace("/dashboard");
  }, [issuedOtp, otpValue, remaining, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto flex w-full h-[calc(100dvh-32px)] md:h-fit max-w-sm flex-col gap-6 rounded-2xl border bg-card p-6 md:p-8 md:text-center shadow-sm">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary">
            Dest Admin
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Secure Access Required
          </h1>
        </div>
        {!showOtpInputs && (
          <Button
            className="w-full mt-auto"
            onClick={handleSendOtp}
            disabled={sendDisabled}
          >
            {phase === "pending" && <Loader />}
            Send OTP
          </Button>
        )}
        {showOtpInputs && (
          <>
            <div className="w-full space-y-3 text-left">
              <Label>One-Time Passcode</Label>
              <InputOTP
                value={otpValue}
                onChange={setOtpValue}
                ref={otpInput}
                maxLength={6}
                disabled={isLoading || allowResend}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && otpValue.trim().length === 6 && !isLoading && !allowResend) {
                    handleVerifyOtp();
                  }
                }}
              >
                <InputOTPGroup>
                  {Array.from({ length: 6 }).map((_, index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {formattedCountdown != "00:00" && (
                <p className="text-xs text-muted-foreground leading-normal mt-4">
                  Code expires in {formattedCountdown}
                </p>
              )}
            </div>
            <div className="flex flex-col items-center justify-between gap-3 mt-auto">
              {!allowResend && <Button
                className="w-full"
                onClick={handleVerifyOtp}
                disabled={isLoading || otpValue.trim().length !== 6}
              >
                {phase === "verifying" && <Loader />}
                Verify & Enter
              </Button>}
              {allowResend ? (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading && <Loader />}
                  Resend OTP
                </Button>
              ) : (
                <span className="w-full h-9 flex items-center justify-center text-xs text-muted-foreground">
                  Resend available once the code expires.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
