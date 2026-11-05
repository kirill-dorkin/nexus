import { render, screen } from "@testing-library/react";
import { CURRENT_LEGAL_DOCUMENT_VERSIONS } from "@platform/contracts/client";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import ConsentPage from "../../app/consent/page";
import PrivacyPage from "../../app/privacy/page";
import TermsPage from "../../app/terms/page";

vi.mock("../learning/learning-shell", () => ({
  LearningShell: ({ children }: { children: ReactNode }) => <>{children}</>
}));

describe("legal documents", () => {
  it.each([
    ["Политика конфиденциальности", PrivacyPage, "personal_data"],
    ["Пользовательское соглашение", TermsPage, "terms"],
    ["Согласие на обработку персональных данных", ConsentPage, "personal_data"]
  ] as const)(
    "%s shows its version and the operator contacts",
    (title, Page, doc) => {
      render(<Page />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        title
      );
      expect(
        screen.getByText(
          new RegExp(`Редакция ${CURRENT_LEGAL_DOCUMENT_VERSIONS[doc]}`)
        )
      ).toBeInTheDocument();
      expect(
        screen.getAllByRole("link", { name: "kirilldorkin.ru@gmail.com" })[0]
      ).toHaveAttribute("href", "mailto:kirilldorkin.ru@gmail.com");
      expect(
        screen.getByRole("link", { name: "+996 999 901 631" })
      ).toHaveAttribute("href", "https://wa.me/996999901631");
    }
  );

  it("discloses the processors and the cross-border transfer", () => {
    render(<PrivacyPage />);
    expect(screen.getByText(/Vercel Inc\./)).toBeInTheDocument();
    expect(screen.getByText(/Neon Inc\./)).toBeInTheDocument();
    expect(screen.getByText(/трансграничную передачу/)).toBeInTheDocument();
  });

  it("names the operator, the laws and the separate consent", () => {
    render(<PrivacyPage />);
    expect(
      screen.getByText(/г\. Бишкек, Кыргызская Республика/)
    ).toBeInTheDocument();
    expect(screen.getByText(/152-ФЗ/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", {
        name: "согласие на обработку персональных данных"
      })
    ).toHaveAttribute("href", "/consent");
  });

  it("lists purposes, data, actions, transfer and withdrawal in the consent", () => {
    render(<ConsentPage />);
    for (const heading of [
      "2. Цели обработки",
      "3. Перечень данных",
      "4. Действия с данными",
      "5. Передача третьим лицам и за рубеж",
      "6. Срок действия и отзыв"
    ]) {
      expect(
        screen.getByRole("heading", { name: heading })
      ).toBeInTheDocument();
    }
  });
});
