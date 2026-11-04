import { Controller, Get } from "@nestjs/common";

/** The deployed commit, short; the production smoke waits for it (not an identifier of anyone). */
export function apiRelease(env: NodeJS.ProcessEnv = process.env): string {
  return env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "local";
}

@Controller("health")
export class HealthController {
  @Get()
  health() {
    return {
      status: "ok",
      service: "api",
      release: apiRelease(),
      now: new Date().toISOString()
    };
  }
}
