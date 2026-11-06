import type { Metadata } from "next";
import { AuthFrame } from "../login/auth-frame";
import { PasswordResetRequestForm } from "../login/password-reset-forms";

export const metadata: Metadata = {
  title: "Восстановление пароля",
  robots: { index: false, follow: false }
};

export default function ForgotPasswordPage() {
  return (
    <AuthFrame>
      <PasswordResetRequestForm />
    </AuthFrame>
  );
}
