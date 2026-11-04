import { render, screen, within } from "@testing-library/react";
import { CURRENT_LEGAL_DOCUMENT_VERSIONS } from "@platform/contracts";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import PrivacyPage, {
  metadata as privacyMetadata
} from "../../app/privacy/page";
import TermsPage, { metadata as termsMetadata } from "../../app/terms/page";

vi.mock("../learning/learning-shell", () => ({
  LearningShell: ({ children }: { children: ReactNode }) => <>{children}</>
}));

describe("legal document placeholders", () => {
  it.each([
    ["Политика конфиденциальности", PrivacyPage, "personal_data"],
    ["Условия использования", TermsPage, "terms"]
  ] as const)("%s is a marked draft without legal text", (title, Page, doc) => {
    render(<Page />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(title);
    expect(screen.getByText(/Черновик/)).toBeInTheDocument();
    expect(
      screen.getByText(`Версия: ${CURRENT_LEGAL_DOCUMENT_VERSIONS[doc]}`)
    ).toBeInTheDocument();
    const sections = screen.getAllByRole("listitem");
    expect(sections.length).toBeGreaterThan(0);
    for (const section of sections) {
      expect(
        within(section).getByText("[Текст раздела предоставит владелец]")
      ).toBeInTheDocument();
    }
  });

  it("keeps placeholder pages out of search results", () => {
    expect(privacyMetadata.robots).toMatchObject({ index: false });
    expect(termsMetadata.robots).toMatchObject({ index: false });
  });
});
