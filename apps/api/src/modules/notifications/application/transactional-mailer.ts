/** Server-owned transactional emails (ADR-0082). Callers never pass free text. */
export type TransactionalMail = Readonly<{
  template: "password_reset";
  to: string;
  variables: Readonly<{ resetUrl: string }>;
}>;

/** The mail port. Modules depend on it, never on a provider. */
export abstract class TransactionalMailer {
  /** Whether a provider is configured; without one nothing is sent. */
  abstract isEnabled(): boolean;

  /** Sends one email. Throws when the provider refuses or is unreachable. */
  abstract send(mail: TransactionalMail): Promise<void>;
}
