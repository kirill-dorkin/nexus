import { Module } from "@nestjs/common";

import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { ExactWebOriginGuard } from "../../http/exact-web-origin.guard";
import { OutboxModule } from "../../outbox/outbox.module";
import { AuthorizationModule } from "../authorization/authorization.module";
import { IdentityModule } from "../identity/identity.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { FeedbackRepository } from "./application/feedback.repository";
import { FeedbackApplicationService } from "./application/feedback.service";
import {
  FeedbackController,
  StudioFeedbackController
} from "./feedback.controller";
import { PostgresFeedbackRepository } from "./infrastructure/postgres-feedback.repository";

/** Learner feedback reports (ADR-0085). */
@Module({
  imports: [
    IdentityModule,
    AuthorizationModule,
    OrganizationsModule,
    OutboxModule
  ],
  controllers: [FeedbackController, StudioFeedbackController],
  providers: [
    FeedbackApplicationService,
    BrowserWriteOriginGuard,
    ExactWebOriginGuard,
    { provide: FeedbackRepository, useClass: PostgresFeedbackRepository }
  ]
})
export class FeedbackModule {}
