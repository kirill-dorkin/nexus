import type { Metadata } from "next";
import { LegalDocumentPlaceholder } from "../../components/legal/legal-document-placeholder";

export const metadata: Metadata = {
  title: "Политика конфиденциальности",
  alternates: { canonical: "/privacy" },
  // Placeholder text must not be indexed; remove when the owner publishes the approved text.
  robots: { index: false, follow: true }
};

// Section headings only; the owner supplies every text and the operator details.
const sections = [
  "Оператор персональных данных",
  "Какие данные обрабатываются",
  "Цели и правовые основания обработки",
  "Сроки хранения и удаление",
  "Передача третьим лицам и трансграничная передача",
  "Cookie и обезличенная статистика",
  "Права субъекта персональных данных",
  "Контакты для обращений"
] as const;

export default function PrivacyPage() {
  return (
    <LegalDocumentPlaceholder
      title="Политика конфиденциальности"
      document="personal_data"
      sections={sections}
    />
  );
}
