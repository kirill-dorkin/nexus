import {
  Controller,
  Get,
  Header,
  Post,
  ForbiddenException,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ownOrganizationsSchema,
  studioListQuerySchema
} from "@platform/contracts";
import { DatabaseService } from "../../database/database.service";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { RequestContextService } from "../../request-context/request-context.service";
import { IdentityApplicationService } from "../identity/application/identity.service";
@Controller("me/organizations")
export class OwnOrganizationsController {
  constructor(
    private readonly database: DatabaseService,
    private readonly context: RequestContextService,
    private readonly identity: IdentityApplicationService
  ) {}
  @Get()
  @Header("Cache-Control", "no-store")
  list(@Query() query: unknown) {
    const after = parseRequest(studioListQuerySchema, query).after ?? null;
    const principal = this.context.requirePrincipal();
    return this.database.userTransaction(
      principal,
      async (tx) => {
        await this.identity.requireActiveUser(tx, principal.userId);
        const rows = (
          await tx.client.query<{ id: string; slug: string; name: string }>(
            "SELECT id::text,slug,name FROM organizations.list_own_active_organizations($1::uuid)",
            [after]
          )
        ).rows;
        return ownOrganizationsSchema.parse({
          organizations: rows.slice(0, 100),
          nextCursor: rows.length > 100 ? (rows[99]?.id ?? null) : null
        });
      },
      { readOnly: true }
    );
  }
  // Retain the old URL only as an explicit fail-closed compatibility boundary.
  // Session and Origin are not platform-owner provisioning authority.
  @Post()
  @UseGuards(BrowserWriteOriginGuard)
  @Header("Cache-Control", "no-store")
  create(): never {
    this.context.requirePrincipal();
    throw new ForbiddenException(
      "Organization creation is available only through trusted operations."
    );
  }
}
