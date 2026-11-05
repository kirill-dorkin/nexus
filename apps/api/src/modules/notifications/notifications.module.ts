import { Module } from "@nestjs/common";

import { TransactionalMailer } from "./application/transactional-mailer";
import { mailerFromEnvironment } from "./infrastructure/resend-mailer";

/** Transactional email (ADR-0082). Exposes only the mail port. */
@Module({
  providers: [
    { provide: TransactionalMailer, useFactory: () => mailerFromEnvironment() }
  ],
  exports: [TransactionalMailer]
})
export class NotificationsModule {}
