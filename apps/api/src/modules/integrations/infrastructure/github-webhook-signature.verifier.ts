import { createHmac, timingSafeEqual } from "node:crypto";

import {
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";

@Injectable()
export class GitHubWebhookSignatureVerifier {
  verify(rawBody: Buffer, signatureHeader: string | undefined): void {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (secret === undefined || secret.length === 0) {
      throw new ServiceUnavailableException(
        "GitHub webhook verification is not configured."
      );
    }

    const match = /^sha256=([0-9a-f]{64})$/.exec(signatureHeader ?? "");
    const signatureHex = match?.[1];
    if (signatureHex === undefined) {
      throw new UnauthorizedException("Invalid GitHub webhook signature.");
    }

    const expected = createHmac("sha256", secret).update(rawBody).digest();
    const actual = Buffer.from(signatureHex, "hex");

    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
      throw new UnauthorizedException("Invalid GitHub webhook signature.");
    }
  }
}
