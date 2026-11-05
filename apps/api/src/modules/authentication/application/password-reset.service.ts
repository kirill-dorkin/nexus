import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import type {
  IdentityUser,
  PasswordResetConfirm,
  PasswordResetRequest
} from "@platform/contracts";

import { DatabaseService } from "../../../database/database.service";
import { optionalConfiguredWebOrigin } from "../../../http/web-app-origin";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { TransactionalMailer } from "../../notifications/application/transactional-mailer";
import { AuthenticationRepository } from "./authentication.repository";
import type { AuthenticationResult } from "./authentication.service";
import { hashPassword } from "../domain/password-hasher";
import {
  createSessionToken,
  hashSessionToken,
  isSessionToken
} from "../domain/session-token";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Every request answers no sooner than this, so timing does not reveal accounts. */
const MIN_REQUEST_MS = 1200;
export const INVALID_RESET_MESSAGE =
  "The reset link is invalid or has expired.";

const wait = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, Math.max(0, ms)));

/** Password reset by an emailed single-use link (ADR-0082). */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger("PasswordReset");

  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityApplicationService,
    private readonly authentication: AuthenticationRepository,
    private readonly mailer: TransactionalMailer
  ) {}

  available(): boolean {
    return this.mailer.isEnabled() && this.linkOrigin() !== null;
  }

  /**
   * Always resolves the same way: whether an account exists, has no password
   * or is suspended is never visible to the caller.
   */
  async request(command: PasswordResetRequest): Promise<void> {
    const started = Date.now();
    try {
      await this.issue(command.email);
    } catch (error) {
      this.logger.warn(
        `auth.password_reset_request_failed ${error instanceof Error ? error.name : "unknown"}`
      );
    }
    await wait(MIN_REQUEST_MS - (Date.now() - started));
  }

  async confirm(command: PasswordResetConfirm): Promise<AuthenticationResult> {
    if (!isSessionToken(command.token)) {
      throw new BadRequestException(INVALID_RESET_MESSAGE);
    }
    const passwordHash = await hashPassword(command.password);
    const sessionToken = createSessionToken();

    const user = await this.database.transaction(
      async (transaction): Promise<IdentityUser> => {
        const userId = await this.authentication.consumePasswordResetToken(
          transaction,
          hashSessionToken(command.token)
        );
        const active =
          userId === null
            ? null
            : await this.identity.findActiveUser(transaction, userId);
        if (active === null) {
          throw new BadRequestException(INVALID_RESET_MESSAGE);
        }
        await this.authentication.setPasswordHash(
          transaction,
          active.id,
          passwordHash
        );
        await this.authentication.revokeUserSessions(transaction, active.id);
        await this.authentication.createSession(transaction, {
          userId: active.id,
          tokenHash: hashSessionToken(sessionToken),
          expiresAt: new Date(Date.now() + SESSION_TTL_MS)
        });
        return active;
      }
    );
    return { user, sessionToken };
  }

  private async issue(email: string): Promise<void> {
    const origin = this.linkOrigin();
    if (!this.mailer.isEnabled() || origin === null) return;

    const token = createSessionToken();
    const recipient = await this.database.transaction(async (transaction) => {
      const user = await this.identity.findByEmail(transaction, email);
      if (user?.status !== "active") return null;
      await this.authentication.createPasswordResetToken(transaction, {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS)
      });
      return user.email;
    });
    if (recipient === null) return;

    // Sent after the commit: a provider outage never leaves a half-made token.
    await this.mailer.send({
      template: "password_reset",
      to: recipient,
      variables: { resetUrl: `${origin}/reset-password#token=${token}` }
    });
  }

  private linkOrigin(): string | null {
    try {
      return optionalConfiguredWebOrigin();
    } catch {
      return null;
    }
  }
}
