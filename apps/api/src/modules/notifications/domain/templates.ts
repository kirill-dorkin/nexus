import type { TransactionalMail } from "../application/transactional-mailer";

export type RenderedMail = Readonly<{
  subject: string;
  text: string;
  html: string;
}>;

const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char
  );

/** Fixed Russian templates: plain text and simple HTML, no images or tracking. */
export function renderMail(
  mail: TransactionalMail,
  productName: string
): RenderedMail {
  const url = mail.variables.resetUrl;
  const subject = `Сброс пароля в ${productName}`;
  const lines = [
    "Здравствуйте!",
    "",
    `Кто-то запросил сброс пароля для вашего аккаунта в ${productName}.`,
    "Чтобы задать новый пароль, откройте ссылку (она действует 30 минут и работает один раз):",
    "",
    url,
    "",
    "Если вы не запрашивали сброс, просто проигнорируйте это письмо: пароль останется прежним.",
    "",
    `— ${productName}`
  ];
  const html = [
    "<p>Здравствуйте!</p>",
    `<p>Кто-то запросил сброс пароля для вашего аккаунта в ${escape(productName)}.</p>`,
    "<p>Чтобы задать новый пароль, откройте ссылку. Она действует 30 минут и работает один раз.</p>",
    `<p><a href="${escape(url)}">Задать новый пароль</a></p>`,
    "<p>Если вы не запрашивали сброс, просто проигнорируйте это письмо: пароль останется прежним.</p>",
    `<p>— ${escape(productName)}</p>`
  ].join("\n");
  return { subject, text: lines.join("\n"), html };
}
