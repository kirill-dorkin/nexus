import { render, screen } from "@testing-library/react";
import { CURRENT_LEGAL_DOCUMENT_VERSIONS } from "@platform/contracts/client";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import PrivacyPage from "../../app/privacy/page";
import TermsPage from "../../app/terms/page";

vi.mock("../learning/learning-shell", () => ({
  LearningShell: ({ children }: { children: ReactNode }) => <>{children}</>
}));

describe("legal documents", () => {
  it.each([
    ["Политика конфиденциальности", PrivacyPage, "personal_data"],
    ["Пользовательское соглашение", TermsPage, "terms"]
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
});
