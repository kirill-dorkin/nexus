import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";

describe("browser API CORS boundary", () => {
  const previousWebOrigin = process.env.WEB_APP_ORIGIN;
  const webOrigin = "https://web.example.test";
  let app: NestFastifyApplication;

  beforeAll(async () => {
    process.env.WEB_APP_ORIGIN = webOrigin;
    app = await createApiApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) await app.close();
    if (previousWebOrigin === undefined) delete process.env.WEB_APP_ORIGIN;
    else process.env.WEB_APP_ORIGIN = previousWebOrigin;
  });

  it("allows credentialed preflight only for the configured web origin", async () => {
    const allowed = await app.inject({
      method: "OPTIONS",
      url: "/v1/auth/login",
      headers: {
        origin: webOrigin,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });

    expect(allowed.statusCode).toBe(204);
    expect(allowed.headers["access-control-allow-origin"]).toBe(webOrigin);
    expect(allowed.headers["access-control-allow-credentials"]).toBe("true");

    const foreign = await app.inject({
      method: "OPTIONS",
      url: "/v1/auth/login",
      headers: {
        origin: "https://other.example.test",
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type"
      }
    });

    expect(foreign.headers["access-control-allow-origin"]).not.toBe(
      "https://other.example.test"
    );
  });
});
