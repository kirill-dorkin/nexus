import {
  TransactionalMailer,
  type TransactionalMail
} from "../application/transactional-mailer";
import { renderMail } from "../domain/templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export type ResendConfig = Readonly<{ apiKey: string; from: string }>;

/** The display name of `Name <address>`, otherwise the address itself. */
export function senderName(from: string): string {
  const match = /^\s*"?([^"<]+?)"?\s*<[^>]+>\s*$/.exec(from);
  return match?.[1]?.trim() || from.trim();
}

/** Resend over its HTTP API; the key lives only in the environment. */
export class ResendMailer extends TransactionalMailer {
  constructor(
    private readonly config: ResendConfig,
    private readonly request: typeof fetch = fetch
  ) {
    super();
  }

  isEnabled(): boolean {
    return true;
  }

  async send(mail: TransactionalMail): Promise<void> {
    const rendered = renderMail(mail, senderName(this.config.from));
    const response = await this.request(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.config.apiKey}`,
        "content-type": "application/json"
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [mail.to],
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      }),
      signal: AbortSignal.timeout(10_000)
    });
    if (!response.ok) {
      throw new Error(`Mail provider answered ${response.status}.`);
    }
  }
}

/** No provider configured: nothing is sent and reset is reported unavailable. */
export class DisabledMailer extends TransactionalMailer {
  isEnabled(): boolean {
    return false;
  }

  send(): Promise<void> {
    return Promise.reject(new Error("Transactional mail is not configured."));
  }
}

/** The mailer the environment asks for. Incomplete settings disable mail. */
export function mailerFromEnvironment(
  env: NodeJS.ProcessEnv = process.env
): TransactionalMailer {
  const apiKey = env.RESEND_API_KEY?.trim();
  const from = env.MAIL_FROM?.trim();
  if (env.MAIL_PROVIDER === "resend" && apiKey && from) {
    return new ResendMailer({ apiKey, from });
  }
  return new DisabledMailer();
}
