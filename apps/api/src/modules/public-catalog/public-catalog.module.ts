import { Module } from "@nestjs/common";

import { CommerceModule } from "../commerce/commerce.module";
import { LearningDeliveryModule } from "../learning-delivery/learning-delivery.module";
import { OrganizationsModule } from "../organizations/organizations.module";
import { PublicCatalogController } from "./public-catalog.controller";
import { PublicCatalogService } from "./public-catalog.service";

@Module({
  imports: [OrganizationsModule, CommerceModule, LearningDeliveryModule],
  controllers: [PublicCatalogController],
  providers: [PublicCatalogService]
})
export class PublicCatalogModule {}
