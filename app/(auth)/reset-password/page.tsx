"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, resetPassword } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function ResetPasswordPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const otp = searchParams.get("otp") || undefined;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const mutation = useMutation({
    mutationFn: resetPassword,
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!email) {
      toast.error("Email is missing. Restart forgot password flow.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    try {
      const response = await mutation.mutateAsync({
        email,
        otp,
        newPassword,
        confirmPassword,
      });
      toast.success(response.message || "Password reset successful");
      router.push("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AuthShell title="Reset Password">
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[620px] flex-col gap-5"
      >
        <div className="space-y-2">
          <Label className="text-[16px] font-medium">New Password</Label>
          <div className="relative mt-2">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3d6fa9]" />
            <PasswordInput
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="New Password"
              required
              className="h-16 border-[#a0a0a0] bg-transparent pl-12 pr-12 text-[28px]"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-[16px] font-medium">Confirm Password</Label>
          <div className="relative mt-2">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3d6fa9]" />
            <PasswordInput
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm Password"
              required
              className="h-16 border-[#a0a0a0] bg-transparent pl-12 pr-12 text-[28px]"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending}
          className="mt-4 h-16 rounded-[24px] bg-[linear-gradient(180deg,#0356c6_0%,#18079f_100%)] text-[34px] font-semibold"
        >
          {mutation.isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "Continue"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f3f3]" />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
