"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { forgotPassword, getApiErrorMessage } from "@/lib/api";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");

  const { mutateAsync, isPending } = useMutation({
    mutationFn: forgotPassword,
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const response = await mutateAsync({ email });
      toast.success(response.message || "OTP sent");
      router.push(`/verify-otp?email=${encodeURIComponent(email)}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Forgot Password"
      subtitle="Enter your registered email address. we'll send you a code to reset your password."
      className="max-w-[640px]"
    >
      <form
        onSubmit={handleSubmit}
        className="mx-auto flex max-w-[620px] flex-col gap-5"
      >
        <div className="space-y-2">
          <Label className="text-[16px] font-medium">Email Address</Label>
          <div className="relative mt-2">
            <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3d6fa9]" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
              className="h-16 border-[#a0a0a0] bg-transparent pl-12 text-[28px]"
            />
          </div>
        </div>
        <Button
          type="submit"
          disabled={isPending}
          className="mt-4 h-16 rounded-[24px] bg-[linear-gradient(180deg,#0356c6_0%,#18079f_100%)] text-[34px] font-semibold"
        >
          {isPending ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            "Send OTP"
          )}
        </Button>
      </form>
    </AuthShell>
  );
}
