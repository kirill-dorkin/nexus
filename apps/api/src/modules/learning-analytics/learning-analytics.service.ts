import { Injectable } from "@nestjs/common";
import type { LearningAnalyticsBatch } from "@platform/contracts";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { LearningAnalyticsRepository } from "./learning-analytics.repository";

/**
 * Records lesson steps and active time (ADR-0084). Best effort for the learner: unknown
 * addresses are dropped and a failed batch never surfaces in the page.
 */
@Injectable()
export class LearningAnalyticsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly analytics: LearningAnalyticsRepository
  ) {}

  async record(batch: LearningAnalyticsBatch): Promise<number> {
    const userId = this.requestContext.optionalPrincipal()?.userId ?? null;
    return this.database.transaction(async (tx) => {
      let recorded = 0;
      for (const event of batch.events) {
        const address = {
          organizationSlug: event.organizationSlug,
          offeringSlug: event.offeringSlug,
          lessonSlug: event.lessonSlug
        };
        const ok =
          event.type === "lesson_step"
            ? await this.analytics.recordStep(tx, address, event.step)
            : await this.analytics.recordActiveTime(
                tx,
                address,
                userId,
                event.seconds
              );
        if (ok) recorded += 1;
      }
      return recorded;
    });
  }
}
