"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, LockKeyhole, Mail } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "unauthorized") {
      toast.error("Only admin users can access this dashboard");
    }
  }, [searchParams]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (response?.error) {
        toast.error(
          response.error === "CredentialsSignin"
            ? "Invalid email or password"
            : response.error,
        );
        return;
      }

      toast.success("Login successful");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Unable to login now");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Login To Your Account"
      subtitle="Please enter your email and password to continue"
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

        <div className="space-y-2">
          <Label className="text-[16px] font-medium">Password</Label>
          <div className="relative mt-2">
            <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#3d6fa9]" />
            <PasswordInput
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              className="h-16 border-[#a0a0a0] bg-transparent pl-12 pr-12 text-[28px]"
            />
          </div>
          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-[24px] font-medium text-[#3668ae] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="mt-6 h-16 rounded-[24px] bg-[linear-gradient(180deg,#0356c6_0%,#18079f_100%)] text-[34px] font-semibold"
        >
          {loading ? <Loader2 className="h-6 w-6 animate-spin" /> : "Login"}
        </Button>
      </form>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f3f3f3]" />}>
      <LoginPageContent />
    </Suspense>
  );
}
