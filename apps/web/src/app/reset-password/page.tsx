import type { Metadata } from "next";
import { AuthFrame } from "../login/auth-frame";
import { PasswordResetConfirmForm } from "../login/password-reset-forms";

export const metadata: Metadata = {
  title: "Новый пароль",
  robots: { index: false, follow: false },
  referrer: "no-referrer"
};

export default function ResetPasswordPage() {
  return (
    <AuthFrame>
      <PasswordResetConfirmForm />
    </AuthFrame>
  );
}
