import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ComponentGallery } from "./component-gallery";

describe("ComponentGallery", () => {
  it("shows every section in order", () => {
    render(<ComponentGallery />);
    expect(
      screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)
    ).toEqual([
      "01 / Визуальные токены",
      "02 / Действия",
      "03 / Поверхности",
      "04 / Поля и выбор",
      "05 / Обратная связь",
      "06 / Диалог",
      "07 / Каталог и длинные названия",
      "08 / Видео урока"
    ]);
  });

  it("switches the theme and accent of the gallery", async () => {
    const { container } = render(<ComponentGallery />);
    const gallery = container.querySelector(".ui-gallery");
    await userEvent.click(screen.getByRole("button", { name: "Светлая" }));
    expect(gallery).toHaveAttribute("data-ui-theme", "light");
    expect(screen.getByRole("button", { name: "Светлая" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    const [, second] = screen
      .getAllByRole("button", { pressed: false })
      .filter((b) => b.closest("[aria-label='Акцент компонентов']"));
    await userEvent.click(second!);
    expect(gallery?.getAttribute("data-ui-accent")).not.toBe("rose");
  });

  it("opens and closes the example dialog", async () => {
    render(<ComponentGallery />);
    const open = screen.getByRole("button", { name: "Открыть пример диалога" });
    await userEvent.click(open);
    expect(open).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(
      screen.getByRole("button", { name: "Закрыть пример" })
    );
    expect(open).toHaveAttribute("aria-expanded", "false");
  });
});
