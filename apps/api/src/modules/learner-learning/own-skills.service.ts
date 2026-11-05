import { Injectable, NotFoundException } from "@nestjs/common";
import { ownSkillsSchema, type OwnSkills } from "@platform/contracts";

import { DatabaseService } from "../../database/database.service";
import { RequestContextService } from "../../request-context/request-context.service";
import { IdentityApplicationService } from "../identity/application/identity.service";
import { OwnSkillsQuery } from "../learning-progress/application/own-skills.query";
import { CheckoutOrganizationQuery } from "../organizations/application/checkout-organization.query";
import { PublicOrganizationQuery } from "../organizations/application/public-organization.query";

const snapshot = { readOnly: true, isolationLevel: "repeatable_read" as const };

/** ADR-0074 point 6: the caller's own skill confirmations across one organization. */
@Injectable()
export class OwnSkillsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly requestContext: RequestContextService,
    private readonly identity: IdentityApplicationService,
    private readonly organizations: PublicOrganizationQuery,
    private readonly memberships: CheckoutOrganizationQuery,
    private readonly skills: OwnSkillsQuery
  ) {}

  async list(organizationSlug: string): Promise<OwnSkills> {
    const { userId } = this.requestContext.requirePrincipal();
    return this.database.userTransaction(
      { userId },
      async (tx) => {
        await this.identity.requireActiveUser(tx, userId);
        if (!(await this.organizations.findActiveBySlug(tx, organizationSlug)))
          throw new NotFoundException("Organization not found.");
        const organization = await this.memberships.resolveActiveMemberBySlug(
          tx,
          organizationSlug
        );
        if (!organization) return ownSkillsSchema.parse({ skills: [] });
        await tx.client.query(
          "SELECT set_config('app.organization_id',$1,true)",
          [organization.id]
        );
        return ownSkillsSchema.parse({
          skills: await this.skills.ownOrganizationSkills(tx, organization.id)
        });
      },
      snapshot
    );
  }
}
