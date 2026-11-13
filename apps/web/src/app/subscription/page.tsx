import { brand } from "@platform/brand";
import type { Metadata } from "next";

import { LearningShell } from "../../components/learning/learning-shell";
import { SubscriptionOffers } from "./subscription-offers";

export const metadata: Metadata = {
  title: "Подписка",
  description: `Все курсы ${brand.name} целиком: проверка заданий во всех главах, подтверждение навыков и рост персонажей. Отмена в один клик.`
};

export default function SubscriptionPage() {
  return (
    <LearningShell>
      <SubscriptionOffers />
    </LearningShell>
  );
}
