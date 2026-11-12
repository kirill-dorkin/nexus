import type { DatabaseTransaction } from "@platform/database";

import type { NormalizedLavaEvent } from "./lava-webhook";

export abstract class LavaContractRepository {
  abstract findFirstContract(
    transaction: DatabaseTransaction,
    organizationId: string,
    subscriptionId: string
  ): Promise<{ contractId: string; paymentUrl: string } | null>;

  abstract saveFirstContract(
    transaction: DatabaseTransaction,
    input: Readonly<{
      organizationId: string;
      subscriptionId: string;
      contractId: string;
      paymentUrl: string;
    }>
  ): Promise<void>;

  /** platform_internal.receive_lava_webhook: store once, route, apply. */
  abstract receive(
    transaction: DatabaseTransaction,
    event: NormalizedLavaEvent,
    payload: unknown
  ): Promise<string>;
}
