import {
  ConflictException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import type {
  IdentityUser,
  LoginRequest,
  RegisterRequest
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import { DatabaseService } from "../../../database/database.service";
import { IdentityApplicationService } from "../../identity/application/identity.service";
import { AuthenticationRepository } from "./authentication.repository";
import { hashPassword, verifyPassword } from "../domain/password-hasher";
import {
  createSessionToken,
  hashSessionToken,
  isSessionToken
} from "../domain/session-token";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

type PostgresError = Readonly<{
  code?: unknown;
  constraint?: unknown;
}>;

function isConstraintViolation(
  error: unknown,
  code: string,
  constraint: string
): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const postgresError = error as PostgresError;
  return postgresError.code === code && postgresError.constraint === constraint;
}

export type AuthenticationResult = Readonly<{
  user: IdentityUser;
  sessionToken: string;
}>;

@Injectable()
export class AuthenticationApplicationService {
  constructor(
    private readonly database: DatabaseService,
    private readonly identity: IdentityApplicationService,
    private readonly authentication: AuthenticationRepository
  ) {}

  async register(
    command: RegisterRequest,
    currentSessionToken: string | null
  ): Promise<AuthenticationResult> {
    const passwordHash = await hashPassword(command.password);
    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);
    const userId = await this.database.nextUuid();

    try {
      const user = await this.database.transaction(async (transaction) => {
        const created = await this.identity.createUser(transaction, {
          id: userId,
          email: command.email,
          displayName: command.displayName ?? null
        });

        await this.identity.recordRegistrationConsents(
          transaction,
          userId,
          command.consents
        );
        await this.authentication.createPasswordCredential(
          transaction,
          userId,
          passwordHash
        );
        await this.replaceSession(
          transaction,
          userId,
          tokenHash,
          currentSessionToken
        );

        return created;
      });

      return { user, sessionToken };
    } catch (error) {
      if (isConstraintViolation(error, "23505", "users_email_normalized_key")) {
        throw new ConflictException(
          "An account with this email already exists."
        );
      }
      throw error;
    }
  }

  async login(
    command: LoginRequest,
    currentSessionToken: string | null
  ): Promise<AuthenticationResult> {
    const candidate = await this.database.transaction(async (transaction) => {
      const user = await this.identity.findByEmail(transaction, command.email);
      const passwordHash =
        user === null
          ? null
          : await this.authentication.findPasswordHash(transaction, user.id);

      return { user, passwordHash };
    });

    const passwordMatches = await verifyPassword(
      command.password,
      candidate.passwordHash
    );
    const candidateUser = candidate.user;

    if (!passwordMatches || candidateUser?.status !== "active") {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const sessionToken = createSessionToken();
    const tokenHash = hashSessionToken(sessionToken);

    const user = await this.database.transaction(async (transaction) => {
      const activeUser = await this.identity.findActiveUser(
        transaction,
        candidateUser.id
      );

      if (activeUser === null) {
        throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
      }

      await this.replaceSession(
        transaction,
        activeUser.id,
        tokenHash,
        currentSessionToken
      );
      return activeUser;
    });

    return { user, sessionToken };
  }

  async resolveSessionUserId(sessionToken: string): Promise<string | null> {
    if (!isSessionToken(sessionToken)) {
      return null;
    }

    const tokenHash = hashSessionToken(sessionToken);

    return this.database.transaction(async (transaction) => {
      const userId = await this.authentication.findActiveSessionUserId(
        transaction,
        tokenHash
      );

      if (userId === null) {
        return null;
      }

      const user = await this.identity.findActiveUser(transaction, userId);
      return user?.id ?? null;
    });
  }

  async logout(sessionToken: string | null): Promise<void> {
    if (sessionToken === null || !isSessionToken(sessionToken)) {
      return;
    }

    const tokenHash = hashSessionToken(sessionToken);
    await this.database.transaction((transaction) =>
      this.authentication.revokeSessionByTokenHash(transaction, tokenHash)
    );
  }

  private async replaceSession(
    transaction: DatabaseTransaction,
    userId: string,
    newTokenHash: string,
    currentSessionToken: string | null
  ): Promise<void> {
    if (currentSessionToken !== null && isSessionToken(currentSessionToken)) {
      await this.authentication.revokeSessionByTokenHash(
        transaction,
        hashSessionToken(currentSessionToken)
      );
    }

    await this.authentication.createSession(transaction, {
      userId,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS)
    });
  }
}
