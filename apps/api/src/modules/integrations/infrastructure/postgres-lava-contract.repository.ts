import { Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";

import { LavaContractRepository } from "../application/lava-contract.repository";
import type { NormalizedLavaEvent } from "../application/lava-webhook";

@Injectable()
export class PostgresLavaContractRepository extends LavaContractRepository {
  async findFirstContract(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ) {
    const result = await transaction.client.query<{
      contract_id: string;
      payment_url: string;
    }>(
      `SELECT contract_id::text, payment_url
         FROM integrations.lava_contracts
        WHERE organization_id = $1 AND subscription_id = $2 AND parent_contract_id IS NULL`,
      [organizationId, subscriptionId]
    );
    const row = result.rows[0];
    return row === undefined
      ? null
      : { contractId: row.contract_id, paymentUrl: row.payment_url };
  }

  async saveFirstContract(
    transaction: DatabaseTransaction,
    input: Parameters<LavaContractRepository["saveFirstContract"]>[1]
  ) {
    await transaction.client.query(
      `INSERT INTO integrations.lava_contracts
         (contract_id, organization_id, subscription_id, payment_url)
       VALUES ($1, $2, $3, $4)`,
      [
        input.contractId,
        input.organizationId,
        input.subscriptionId,
        input.paymentUrl
      ]
    );
  }

  async receive(
    transaction: DatabaseTransaction,
    event: NormalizedLavaEvent,
    payload: unknown
  ): Promise<string> {
    const result = await transaction.client.query<{ outcome: string }>(
      `SELECT platform_internal.receive_lava_webhook($1, $2, $3, $4, $5, $6, $7, $8::jsonb) AS outcome`,
      [
        event.eventKey,
        event.eventType,
        event.contractId,
        event.parentContractId,
        event.amountMinor,
        event.currency,
        event.occurredAt,
        JSON.stringify(payload)
      ]
    );
    return result.rows[0]?.outcome ?? "unknown";
  }
}
