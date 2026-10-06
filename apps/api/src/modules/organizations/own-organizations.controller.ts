import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  Post,
  Query,
  UseGuards
} from "@nestjs/common";
import {
  ownOrganizationsSchema,
  studioCreateOrganizationSchema,
  studioListQuerySchema
} from "@platform/contracts";
import { DatabaseService } from "../../database/database.service";
import { BrowserWriteOriginGuard } from "../../http/browser-write-origin.guard";
import { parseRequest } from "../../http/validation";
import { RequestContextService } from "../../request-context/request-context.service";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { OrganizationsApplicationService } from "./application/organizations.service";
@Controller("me/organizations")
export class OwnOrganizationsController {
  constructor(
    private readonly database: DatabaseService,
    private readonly context: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: OrganizationsApplicationService
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
          nextCursor: rows.length > 100 ? rows[99]!.id : null
        });
      },
      { readOnly: true }
    );
  }
  @Post()
  @UseGuards(BrowserWriteOriginGuard)
  @HttpCode(201)
  @Header("Cache-Control", "no-store")
  create(@Body() body: unknown) {
    return this.organizations.createOrganization(
      parseRequest(studioCreateOrganizationSchema, body)
    );
  }
}
