import { Injectable, Logger, UnauthorizedException } from "@nestjs/common";

import { DatabaseService } from "../../../database/database.service";
import { requireLavaSetting } from "./lava-config";
import { LavaContractRepository } from "./lava-contract.repository";
import { lavaWebhookAuthorized, normalizeLavaEvent } from "./lava-webhook";

/** ADR-0087 §6: authenticate, store once, route and apply in one transaction. */
@Injectable()
export class LavaWebhookApplicationService {
  private readonly logger = new Logger("LavaWebhook");

  constructor(
    private readonly database: DatabaseService,
    private readonly contracts: LavaContractRepository
  ) {}

  async receive(apiKey: string | undefined, body: unknown): Promise<string> {
    if (
      !lavaWebhookAuthorized(apiKey, requireLavaSetting("LAVA_WEBHOOK_SECRET"))
    )
      throw new UnauthorizedException();
    const event = normalizeLavaEvent(body, new Date());
    if (event === null) {
      // Answer 2xx so lava.top does not retry a body we will never understand.
      this.logger.warn("lava webhook with an unknown shape ignored");
      return "ignored";
    }
    const outcome = await this.database.transaction((transaction) =>
      this.contracts.receive(transaction, event, body)
    );
    if (
      outcome === "needs_review" ||
      outcome === "rejected" ||
      outcome === "unmapped"
    )
      this.logger.warn(`lava webhook ${event.eventType}: ${outcome}`);
    return outcome;
  }
}
