import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[1200px] items-center px-5 py-16">
      <AuthForm mode="sign-in" />
    </div>
  );
}
