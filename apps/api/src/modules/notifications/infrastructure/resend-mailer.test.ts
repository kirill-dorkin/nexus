import { describe, expect, it, vi } from "vitest";

import { renderMail } from "../domain/templates";
import {
  DisabledMailer,
  ResendMailer,
  mailerFromEnvironment,
  senderName
} from "./resend-mailer";

const mail = {
  template: "password_reset",
  to: "learner@example.test",
  variables: { resetUrl: "https://academy.test/reset-password#token=abc" }
} as const;

describe("transactional mail", () => {
  it("is disabled unless provider, key and sender are all set", () => {
    expect(mailerFromEnvironment({}).isEnabled()).toBe(false);
    expect(
      mailerFromEnvironment({ MAIL_PROVIDER: "resend", RESEND_API_KEY: "k" })
    ).toBeInstanceOf(DisabledMailer);
    expect(
      mailerFromEnvironment({
        MAIL_PROVIDER: "resend",
        RESEND_API_KEY: "k",
        MAIL_FROM: "A <a@b.test>"
      })
    ).toBeInstanceOf(ResendMailer);
  });

  it("names the product after the sender", () => {
    expect(senderName("Test Academy <noreply@academy.test>")).toBe(
      "Test Academy"
    );
    expect(senderName('"Test Academy" <noreply@academy.test>')).toBe(
      "Test Academy"
    );
    expect(senderName("noreply@academy.test")).toBe("noreply@academy.test");
  });

  it("renders the reset link without tracking and escapes HTML", () => {
    const rendered = renderMail(mail, "A & B");
    expect(rendered.subject).toBe("Сброс пароля в A & B");
    expect(rendered.text).toContain(mail.variables.resetUrl);
    expect(rendered.text).toContain("30 минут");
    expect(rendered.html).toContain("A &amp; B");
    expect(rendered.html).not.toMatch(/<img|<script/);
  });

  it("posts to Resend with the key and fails on a refused send", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 422 }));
    const mailer = new ResendMailer(
      { apiKey: "re_key", from: "Test Academy <noreply@academy.test>" },
      request
    );
    await mailer.send(mail);
    const [url, init] = request.mock.calls[0] ?? [];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init?.headers).get("authorization")).toBe(
      "Bearer re_key"
    );
    expect(
      JSON.parse(typeof init?.body === "string" ? init.body : "null")
    ).toMatchObject({
      to: ["learner@example.test"],
      from: "Test Academy <noreply@academy.test>"
    });
    await expect(mailer.send(mail)).rejects.toThrow("422");
  });
});
