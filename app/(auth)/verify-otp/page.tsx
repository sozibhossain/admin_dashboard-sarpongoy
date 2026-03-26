"use client";

import { FormEvent, Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword, getApiErrorMessage, verifyOtp } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";

const OTP_LENGTH = 6;

function VerifyOtpPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const [otpValues, setOtpValues] = useState<string[]>(
    Array(OTP_LENGTH).fill(""),
  );
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);

  const verifyMutation = useMutation({
    mutationFn: verifyOtp,
  });

  const resendMutation = useMutation({
    mutationFn: forgotPassword,
  });

  const otp = otpValues.join("");

  const handleChange = (index: number, value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(-1);
    const next = [...otpValues];
    next[index] = cleanValue;
    setOtpValues(next);
    if (cleanValue && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Backspace" && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) {
      toast.error("Email is missing. Restart forgot password flow.");
      return;
    }
    if (otp.length !== OTP_LENGTH) {
      toast.error("Please enter a valid 6 digit OTP");
      return;
    }

    try {
      const response = await verifyMutation.mutateAsync({
        email,
        otp,
      });
      toast.success(response.message || "OTP verified");
      router.push(
        `/reset-password?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`,
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  const handleResend = async () => {
    if (!email) {
      toast.error("Email is missing. Restart forgot password flow.");
      return;
    }

    try {
      const response = await resendMutation.mutateAsync({ email });
      toast.success(response.message || "OTP resent");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Enter OTP">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[620px] flex-col items-center gap-6"
      >
        <div className="flex w-full justify-between gap-3 sm:gap-4">
          {otpValues.map((digit, index) => (
            <input
              key={index}
              ref={(node) => {
                inputRefs.current[index] = node;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={digit}
              onChange={(event) => handleChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              className="h-16 w-16 rounded-lg border border-[#a0a0a0] bg-transparent text-center text-[36px] font-semibold text-[#1f1f1f] focus:outline-none focus:ring-2 focus:ring-[#355aa6]"
            />
          ))}
        </div>

        <p className="text-[16px] text-[#3d3d3d]">
          Didn&apos;t Receive OTP?{" "}
          <button
            type="button"
            className="font-semibold text-[#2f64ac]"
            onClick={handleResend}
            disabled={resendMutation.isPending}
          >
            RESEND OTP
          </button>
        </p>

        <Button
          type="submit"
          disabled={verifyMutation.isPending}
          className="h-16 w-full rounded-[24px] bg-[linear-gradient(180deg,#0356c6_0%,#18079f_100%)] text-[34px] font-semibold"
        >
          {verifyMutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "Verify"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f3f3]" />}>
      <VerifyOtpPageContent />
    </Suspense>
  );
}
