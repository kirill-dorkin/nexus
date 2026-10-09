import { LearningShell } from "../../components/learning/learning-shell";
import { safeLearningReturnTo } from "../../lib/learning-return-to";
import { LearningAuth } from "./learning-auth";
export const dynamic = "force-dynamic";
export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  return (
    <LearningShell layout="viewport">
      <LearningAuth
        returnTo={safeLearningReturnTo((await searchParams).returnTo)}
      />
    </LearningShell>
  );
}
