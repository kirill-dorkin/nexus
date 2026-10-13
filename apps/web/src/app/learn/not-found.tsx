import Link from "next/link";
import { buttonClass } from "@platform/ui";
import { LearningShell } from "../../components/learning/learning-shell";
import { LearningPageHeading } from "../../components/learning/learning-page-heading";
export default function LearningNotFound() {
  return (
    <LearningShell>
      <LearningPageHeading
        eyebrow="Доступ к материалам"
        title="Курс или урок недоступен"
        description="Он мог быть закрыт или ссылка изменилась."
      >
        <div>
          <Link className={buttonClass()} href="/courses">
            Посмотреть доступные курсы
          </Link>
        </div>
      </LearningPageHeading>
    </LearningShell>
  );
}
