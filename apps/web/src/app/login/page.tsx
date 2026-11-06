import { AuthFrame } from "./auth-frame";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import { LearningAuth } from "./learning-auth";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{
    returnTo?: string | string[];
    mode?: string | string[];
    oauthError?: string | string[];
  }>;
}) {
  const query = await searchParams;
  return (
    <AuthFrame>
      <LearningAuth
        returnTo={safeLearningReturnTo(query.returnTo)}
        initialMode={query.mode === "register" ? "register" : "login"}
        externalLoginFailed={query.oauthError === "external_login_failed"}
      />
    </AuthFrame>
  );
}
