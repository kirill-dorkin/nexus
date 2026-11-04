import type { Metadata } from "next";
import { LegalDocumentPlaceholder } from "../../components/legal/legal-document-placeholder";

export const metadata: Metadata = {
  title: "Условия использования",
  alternates: { canonical: "/terms" },
  // Placeholder text must not be indexed; remove when the owner publishes the approved text.
  robots: { index: false, follow: true }
};

// Section headings only; the owner supplies every text and the operator details.
const sections = [
  "Кто предоставляет сервис",
  "Предмет соглашения",
  "Аккаунт и регистрация",
  "Правила использования материалов",
  "Платные услуги",
  "Ответственность сторон",
  "Изменение условий",
  "Контакты"
] as const;

export default function TermsPage() {
  return (
    <LegalDocumentPlaceholder
      title="Условия использования"
      document="terms"
      sections={sections}
    />
  );
}
