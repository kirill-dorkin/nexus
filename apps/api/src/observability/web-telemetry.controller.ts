import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  ServiceUnavailableException
} from "@nestjs/common";
import {
  webTelemetryBatchSchema,
  type WebTelemetryBatch
} from "@platform/contracts";

import {
  optionalConfiguredWebOrigin,
  parseExactHttpOrigin
} from "../http/web-app-origin";
import { parseRequest } from "../http/validation";

const logger = new Logger("WebTelemetry");

/**
 * Receives client errors and Web Vitals from the Web app (ADR-0067) and
 * writes them to the process log as low-cardinality events, like the
 * public-launch operational events (ADR-0052). Nothing is stored.
 */
@Controller("telemetry")
export class WebTelemetryController {
  @Post("web")
  @HttpCode(HttpStatus.NO_CONTENT)
  receive(
    @Headers("origin") origin: string | undefined,
    @Body() body: unknown
  ): void {
    // Only the site itself may report; other pages cannot fill the log.
    let expected: string | null;
    try {
      expected = optionalConfiguredWebOrigin();
    } catch {
      expected = null;
    }
    if (expected === null)
      throw new ServiceUnavailableException(
        "WEB_APP_ORIGIN is not configured."
      );
    if (origin === undefined || parseExactHttpOrigin(origin) !== expected)
      throw new ForbiddenException("Telemetry origin is not allowed.");

    record(parseRequest(webTelemetryBatchSchema, body));
  }
}

function record(batch: WebTelemetryBatch): void {
  for (const event of batch.events) {
    // Best effort: a failed log write never changes the response.
    try {
      if (event.type === "client_error") {
        const { kind, errorName, source, route } = event;
        logger.warn(
          JSON.stringify({
            event: "web.client_error",
            release: batch.release,
            kind,
            errorName,
            source,
            route
          })
        );
      } else {
        const { name, rating, value, route } = event;
        logger.log(
          JSON.stringify({
            event: "web.vital",
            release: batch.release,
            name,
            rating,
            value: Math.round(value * 1000) / 1000,
            route
          })
        );
      }
    } catch {
      // Telemetry fails open.
    }
  }
}
