import { randomUUID } from "node:crypto";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { createDatabasePool } from "@platform/database";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";

import { createApiApplication } from "./app.factory";

function env(name: string) {
  const value = process.env[name];
  if (!value) throw Error(`${name} required`);
  return value;
}

type SentMail = { to: string[]; subject: string; text: string; html: string };

describe("password reset HTTP + PostgreSQL boundary (ADR-0082)", () => {
  const migration = createDatabasePool(env("DATABASE_MIGRATION_URL"));
  const origin = "https://learning.example.test";
  const saved = {
    WEB_APP_ORIGIN: process.env.WEB_APP_ORIGIN,
    MAIL_PROVIDER: process.env.MAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    MAIL_FROM: process.env.MAIL_FROM
  };
  const sent: SentMail[] = [];
  const provider = vi.fn((_url: string, init?: RequestInit) => {
    sent.push(
      JSON.parse(
        typeof init?.body === "string" ? init.body : "null"
      ) as SentMail
    );
    return Promise.resolve(new Response("{}", { status: 200 }));
  });
  let app: NestFastifyApplication;
  let email: string;
  let userId: string;

  const post = (url: string, payload: object, cookie?: string) =>
    app.inject({
      method: "POST",
      url: `/v1/${url}`,
      headers: { origin, ...(cookie ? { cookie } : {}) },
      payload
    });
  const tokenOf = (mail: SentMail | undefined) => {
    const match = /reset-password#token=([A-Za-z0-9_-]{43})/.exec(
      mail?.text ?? ""
    );
    if (!match?.[1]) throw new Error("No reset link in the mail.");
    return match[1];
  };
  const cookieOf = (response: { headers: Record<string, unknown> }) =>
    String(response.headers["set-cookie"]).split(";")[0] ?? "";

  beforeAll(async () => {
    Object.assign(process.env, {
      WEB_APP_ORIGIN: origin,
      MAIL_PROVIDER: "resend",
      RESEND_API_KEY: "re_test_key",
      MAIL_FROM: "Test Academy <noreply@example.test>"
    });
    vi.stubGlobal("fetch", provider);
    app = await createApiApplication();
    await app.init();
    email = `${randomUUID()}@example.test`;
    userId = (
      await migration.query<{ id: string }>(
        "INSERT INTO identity.users(email, display_name) VALUES ($1, 'Reset learner') RETURNING id",
        [email]
      )
    ).rows[0]!.id;
  });

  beforeEach(() => {
    sent.length = 0;
    provider.mockClear();
  });

  afterAll(async () => {
    await app?.close();
    await migration.query("DELETE FROM identity.users WHERE id = $1", [userId]);
    await migration.end();
    vi.unstubAllGlobals();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("reports that reset is available when mail is configured", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/auth/password-reset"
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ available: true });
  });

  it("answers 202 for unknown addresses and sends nothing", async () => {
    const response = await post("auth/password-reset/request", {
      email: `${randomUUID()}@example.test`
    });
    expect(response.statusCode).toBe(202);
    expect(response.body).toBe("");
    expect(provider).not.toHaveBeenCalled();
  });

  it("mails a single-use link, sets the password, revokes sessions and signs in", async () => {
    const first = await post("auth/password-reset/request", {
      email: email.toUpperCase()
    });
    expect(first.statusCode).toBe(202);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toEqual([email]);
    expect(sent[0]?.subject).toBe("Сброс пароля в Test Academy");
    expect(sent[0]?.text).toContain(`${origin}/reset-password#token=`);
    const token = tokenOf(sent[0]);

    const stored = await migration.query<{ token_hash: string }>(
      "SELECT token_hash FROM identity.password_reset_tokens WHERE user_id = $1",
      [userId]
    );
    expect(stored.rows.map((row) => row.token_hash)).not.toContain(token);

    const password = "a brand new long password";
    const confirmed = await post("auth/password-reset/confirm", {
      token,
      password
    });
    expect(confirmed.statusCode, confirmed.body).toBe(200);
    expect(confirmed.json()).toMatchObject({ id: userId, email });
    const session = cookieOf(confirmed);
    expect(session).toMatch(/=/);

    const reused = await post("auth/password-reset/confirm", {
      token,
      password: "another long password value"
    });
    expect(reused.statusCode).toBe(400);

    const login = await post("auth/login", { email, password });
    expect(login.statusCode).toBe(200);

    // A second reset revokes the earlier sessions.
    await post("auth/password-reset/request", { email });
    const second = await post("auth/password-reset/confirm", {
      token: tokenOf(sent.at(-1)),
      password: "the third long password"
    });
    expect(second.statusCode).toBe(200);
    const open = await migration.query<{ count: string }>(
      "SELECT count(*) FROM identity.sessions WHERE user_id = $1 AND revoked_at IS NULL",
      [userId]
    );
    expect(Number(open.rows[0]?.count)).toBe(1);
    const me = await app.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: session }
    });
    expect(me.statusCode).toBe(401);
  });

  it("supersedes an earlier link with a newer request", async () => {
    await post("auth/password-reset/request", { email });
    await post("auth/password-reset/request", { email });
    const [older, newer] = [tokenOf(sent[0]), tokenOf(sent[1])];
    const stale = await post("auth/password-reset/confirm", {
      token: older,
      password: "superseded long password"
    });
    expect(stale.statusCode).toBe(400);
    const fresh = await post("auth/password-reset/confirm", {
      token: newer,
      password: "the newest long password"
    });
    expect(fresh.statusCode).toBe(200);
  });

  it("refuses expired, malformed and suspended-account tokens alike", async () => {
    await post("auth/password-reset/request", { email });
    const token = tokenOf(sent[0]);
    await migration.query(
      "UPDATE identity.password_reset_tokens SET created_at = now() - interval '1 hour', expires_at = now() - interval '1 minute' WHERE user_id = $1 AND used_at IS NULL AND superseded_at IS NULL",
      [userId]
    );
    const expired = await post("auth/password-reset/confirm", {
      token,
      password: "expired link long password"
    });
    expect(expired.statusCode).toBe(400);

    const malformed = await post("auth/password-reset/confirm", {
      token: "not-a-token",
      password: "malformed long password"
    });
    expect(malformed.statusCode).toBe(400);

    await migration.query(
      "UPDATE identity.users SET status = 'suspended' WHERE id = $1",
      [userId]
    );
    try {
      await post("auth/password-reset/request", { email });
      expect(provider).not.toHaveBeenCalled();
    } finally {
      await migration.query(
        "UPDATE identity.users SET status = 'active' WHERE id = $1",
        [userId]
      );
    }
  });
});
