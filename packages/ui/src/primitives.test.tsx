import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Dialog } from "./dialog";
import {
  Alert,
  Button,
  ButtonLink,
  Checkbox,
  Field,
  Input,
  Progress,
  Radio
} from "./index";
import { PasswordInput } from "./password-input";

describe("Button", () => {
  it("is a non-submitting button unless asked otherwise", () => {
    render(<Button>Сохранить</Button>);
    expect(screen.getByRole("button", { name: "Сохранить" })).toHaveAttribute(
      "type",
      "button"
    );
  });

  it("is disabled and announces busy while loading", async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Проверяем…
      </Button>
    );
    const button = screen.getByRole("button", { name: "Проверяем…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ButtonLink", () => {
  it("is a link with its text as the accessible name", () => {
    render(<ButtonLink href="/courses">Все курсы</ButtonLink>);
    expect(screen.getByRole("link", { name: "Все курсы" })).toHaveAttribute(
      "href",
      "/courses"
    );
  });
});

describe("Field", () => {
  it("labels its control", () => {
    render(
      <Field htmlFor="email" label="Почта">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByLabelText("Почта")).toBe(screen.getByRole("textbox"));
  });

  it("announces an error as an alert", () => {
    render(
      <Field htmlFor="email" label="Почта" error="Неверный адрес">
        <Input id="email" />
      </Field>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Неверный адрес");
  });
});

describe("Radio and Checkbox", () => {
  it("are named by their label and toggled by clicking it", async () => {
    render(
      <>
        <Radio name="answer" value="a" label="Вариант А" />
        <Checkbox name="many" value="b" label="Вариант Б" />
      </>
    );
    await userEvent.click(screen.getByText("Вариант А"));
    await userEvent.click(screen.getByText("Вариант Б"));
    expect(screen.getByRole("radio", { name: "Вариант А" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Вариант Б" })).toBeChecked();
  });
});

describe("Alert", () => {
  it("is an alert for danger and a polite status otherwise", () => {
    render(
      <>
        <Alert tone="danger">Ошибка</Alert>
        <Alert tone="success" title="Правильно">
          Молодец
        </Alert>
      </>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Ошибка");
    expect(screen.getByRole("status")).toHaveTextContent("ПравильноМолодец");
  });
});

describe("Progress", () => {
  it("clamps the value and names the bar", () => {
    render(<Progress value={140} label="Прогресс курса" />);
    expect(screen.getByLabelText("Прогресс курса")).toHaveAttribute(
      "value",
      "100"
    );
    expect(screen.getByText("100%")).toBeInTheDocument();
  });

  it("shows no percentage for an unknown value", () => {
    render(<Progress value={Number.NaN} label="Прогресс курса" />);
    expect(screen.queryByText(/%$/)).not.toBeInTheDocument();
  });
});

describe("PasswordInput", () => {
  it("reveals and hides the password with a named, pressed toggle", async () => {
    render(<PasswordInput id="password" aria-label="Пароль" />);
    const input = screen.getByLabelText("Пароль");
    expect(input).toHaveAttribute("type", "password");

    await userEvent.click(
      screen.getByRole("button", { name: "Показать пароль" })
    );
    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Скрыть пароль" })
    ).toHaveAttribute("aria-pressed", "true");
  });

  it("disables the toggle with the input", () => {
    render(<PasswordInput aria-label="Пароль" disabled />);
    expect(
      screen.getByRole("button", { name: "Показать пароль" })
    ).toBeDisabled();
  });
});

function DialogHarness({ onDismiss }: { onDismiss: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>Открыть</Button>
      <Dialog
        open={open}
        aria-label="Подтверждение"
        onDismiss={() => {
          onDismiss();
          setOpen(false);
        }}
      >
        <Button onClick={() => setOpen(false)}>Закрыть</Button>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("opens as a modal and closing from the caller does not report a dismissal", async () => {
    const onDismiss = vi.fn();
    render(<DialogHarness onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole("button", { name: "Открыть" }));
    const dialog = screen.getByRole("dialog", { name: "Подтверждение" });
    expect(dialog).toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("hidden");

    await userEvent.click(screen.getByRole("button", { name: "Закрыть" }));
    expect(dialog).not.toHaveAttribute("open");
    expect(document.body.style.overflow).toBe("");
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it("reports a dismissal when the browser closes it (Escape)", async () => {
    const onDismiss = vi.fn();
    render(<DialogHarness onDismiss={onDismiss} />);
    await userEvent.click(screen.getByRole("button", { name: "Открыть" }));

    screen.getByRole("dialog").dispatchEvent(new Event("close"));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
