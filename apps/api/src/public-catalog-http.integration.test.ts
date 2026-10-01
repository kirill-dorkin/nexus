import { randomUUID } from "node:crypto";

import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import {
  publicCatalogProductResponseSchema,
  publicCatalogSchema
} from "@platform/contracts";
import { createDatabasePool } from "@platform/database";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createApiApplication } from "./app.factory";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (value === undefined || value.trim().length === 0) {
    throw new Error(`${name} is required for public catalog integration tests.`);
  }
  return value;
}

type IdRow = { id: string };

type OrganizationFixture = Readonly<{
  id: string;
  slug: string;
  courseVersionId: string;
}>;

describe("public sellable catalog HTTP boundary", () => {
  const migrationPool = createDatabasePool(
    requireEnv("DATABASE_MIGRATION_URL"),
    { applicationName: "public-catalog-http-integration-fixtures" }
  );
  const appPool = createDatabasePool(requireEnv("DATABASE_URL"), {
    applicationName: "public-catalog-http-integration-security"
  });

  let app: NestFastifyApplication;
  let fixtureUserId = "";
  let primaryOrganization: OrganizationFixture;
  let secondaryOrganization: OrganizationFixture;
  let suspendedOrganization: OrganizationFixture;
  let publicProductSlug = "";
  let secondaryProductSlug = "";
  let publicPriceUsdId = "";
  let publicPriceEurId = "";
  let archivedPriceId = "";
  let closedProductSlug = "";
  let membershipProductSlug = "";
  let noActivePriceProductSlug = "";
  let archivedProductSlug = "";
  const organizationIds: string[] = [];
  const courseIds: string[] = [];

  async function insertId(sql: string, values: readonly unknown[]): Promise<string> {
    const result = await migrationPool.query<IdRow>(sql, values);
    const id = result.rows[0]?.id;
    if (id === undefined) {
      throw new Error("Fixture insert did not return an id.");
    }
    return id;
  }

  async function createOrganization(slugPrefix: string): Promise<OrganizationFixture> {
    const slug = `${slugPrefix}-${randomUUID()}`;
    const organizationId = await insertId(
      `INSERT INTO organizations.organizations
         (slug, name, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [slug, `${slugPrefix} organization`, fixtureUserId]
    );
    organizationIds.push(organizationId);

    const courseId = await insertId(
      `INSERT INTO learning_content.courses
         (organization_id, slug, created_by_user_id)
       VALUES ($1, $2, $3)
       RETURNING id::text`,
      [organizationId, `course-${randomUUID()}`, fixtureUserId]
    );
    courseIds.push(courseId);

    const courseVersionId = await insertId(
      `INSERT INTO learning_content.course_versions
         (organization_id, course_id, version_number, status, title,
          created_by_user_id, published_by_user_id, published_at)
       VALUES ($1, $2, 1, 'published', $3, $4, $4, now())
       RETURNING id::text`,
      [organizationId, courseId, `${slugPrefix} published course`, fixtureUserId]
    );

    return { id: organizationId, slug, courseVersionId };
  }

  async function createOffering(
    organization: OrganizationFixture,
    label: string,
    status: "open" | "closed" | "archived",
    accessMode: "membership" | "entitlement_required"
  ): Promise<string> {
    return insertId(
      `INSERT INTO learning_delivery.learning_offerings
         (organization_id, course_version_id, slug, name, delivery_mode,
          access_mode, status, created_by_user_id)
       VALUES ($1, $2, $3, $4, 'self_paced', $5, $6, $7)
       RETURNING id::text`,
      [
        organization.id,
        organization.courseVersionId,
        `${label}-${randomUUID()}`,
        `${label} offering`,
        accessMode,
        status,
        fixtureUserId
      ]
    );
  }

  async function createProduct(
    organizationId: string,
    offeringId: string,
    slug: string,
    name: string,
    status: "active" | "archived" = "active"
  ): Promise<string> {
    return insertId(
      `INSERT INTO commerce.products
         (organization_id, offering_id, slug, name, status, archived_at,
          created_by_user_id, archived_by_user_id)
       VALUES (
         $1, $2, $3, $4, $5,
         CASE WHEN $5 = 'archived' THEN now() ELSE NULL END,
         $6,
         CASE WHEN $5 = 'archived' THEN $6::uuid ELSE NULL END
       )
       RETURNING id::text`,
      [organizationId, offeringId, slug, name, status, fixtureUserId]
    );
  }

  async function createPrice(
    organizationId: string,
    productId: string,
    currency: string,
    amountMinor: number,
    status: "active" | "archived" = "active"
  ): Promise<string> {
    return insertId(
      `INSERT INTO commerce.prices
         (organization_id, product_id, amount_minor, currency, billing_type,
          status, archived_at, created_by_user_id, archived_by_user_id)
       VALUES (
         $1, $2, $3, $4, 'one_time', $5,
         CASE WHEN $5 = 'archived' THEN now() ELSE NULL END,
         $6,
         CASE WHEN $5 = 'archived' THEN $6::uuid ELSE NULL END
       )
       RETURNING id::text`,
      [organizationId, productId, amountMinor, currency, status, fixtureUserId]
    );
  }

  beforeAll(async () => {
    fixtureUserId = await insertId(
      `INSERT INTO identity.users (email, display_name)
       VALUES ($1, 'Public catalog fixtures')
       RETURNING id::text`,
      [`public-catalog-${randomUUID()}@example.test`]
    );

    primaryOrganization = await createOrganization("public-catalog-primary");
    secondaryOrganization = await createOrganization("public-catalog-secondary");
    suspendedOrganization = await createOrganization("public-catalog-suspended");

    const publicOfferingId = await createOffering(
      primaryOrganization,
      "public",
      "open",
      "entitlement_required"
    );
    publicProductSlug = `professional-typescript-${randomUUID()}`;
    const publicProductId = await createProduct(
      primaryOrganization.id,
      publicOfferingId,
      publicProductSlug,
      "Professional TypeScript"
    );
    publicPriceEurId = await createPrice(
      primaryOrganization.id,
      publicProductId,
      "EUR",
      11900
    );
    publicPriceUsdId = await createPrice(
      primaryOrganization.id,
      publicProductId,
      "USD",
      12900
    );
    archivedPriceId = await createPrice(
      primaryOrganization.id,
      publicProductId,
      "GBP",
      9900,
      "archived"
    );

    const closedOfferingId = await createOffering(
      primaryOrganization,
      "closed",
      "closed",
      "entitlement_required"
    );
    closedProductSlug = `closed-product-${randomUUID()}`;
    const closedProductId = await createProduct(
      primaryOrganization.id,
      closedOfferingId,
      closedProductSlug,
      "Closed product"
    );
    await createPrice(primaryOrganization.id, closedProductId, "USD", 5000);

    const membershipOfferingId = await createOffering(
      primaryOrganization,
      "membership",
      "open",
      "membership"
    );
    membershipProductSlug = `membership-product-${randomUUID()}`;
    const membershipProductId = await createProduct(
      primaryOrganization.id,
      membershipOfferingId,
      membershipProductSlug,
      "Membership product"
    );
    await createPrice(primaryOrganization.id, membershipProductId, "USD", 4000);

    const noActivePriceOfferingId = await createOffering(
      primaryOrganization,
      "archived-price",
      "open",
      "entitlement_required"
    );
    noActivePriceProductSlug = `no-active-price-${randomUUID()}`;
    const noActivePriceProductId = await createProduct(
      primaryOrganization.id,
      noActivePriceOfferingId,
      noActivePriceProductSlug,
      "No active price product"
    );
    await createPrice(
      primaryOrganization.id,
      noActivePriceProductId,
      "USD",
      3000,
      "archived"
    );

    const archivedOfferingId = await createOffering(
      primaryOrganization,
      "archived-product",
      "open",
      "entitlement_required"
    );
    archivedProductSlug = `archived-product-${randomUUID()}`;
    await createProduct(
      primaryOrganization.id,
      archivedOfferingId,
      archivedProductSlug,
      "Archived product",
      "archived"
    );

    const secondaryOfferingId = await createOffering(
      secondaryOrganization,
      "secondary",
      "open",
      "entitlement_required"
    );
    secondaryProductSlug = publicProductSlug;
    const secondaryProductId = await createProduct(
      secondaryOrganization.id,
      secondaryOfferingId,
      secondaryProductSlug,
      "Same slug, second organization"
    );
    await createPrice(secondaryOrganization.id, secondaryProductId, "USD", 7777);

    const suspendedOfferingId = await createOffering(
      suspendedOrganization,
      "suspended",
      "open",
      "entitlement_required"
    );
    const suspendedProductId = await createProduct(
      suspendedOrganization.id,
      suspendedOfferingId,
      `suspended-product-${randomUUID()}`,
      "Suspended organization product"
    );
    await createPrice(suspendedOrganization.id, suspendedProductId, "USD", 8888);

    await migrationPool.query(
      `UPDATE organizations.organizations
          SET status = 'suspended'
        WHERE id = $1`,
      [suspendedOrganization.id]
    );

    app = await createApiApplication();
    await app.init();
  });

  afterAll(async () => {
    if (app !== undefined) {
      await app.close();
    }
    await appPool.end();

    if (organizationIds.length > 0) {
      await migrationPool.query(
        `DELETE FROM commerce.prices WHERE organization_id = ANY($1::uuid[])`,
        [organizationIds]
      );
      await migrationPool.query(
        `DELETE FROM commerce.products WHERE organization_id = ANY($1::uuid[])`,
        [organizationIds]
      );
      await migrationPool.query(
        `DELETE FROM learning_delivery.learning_offerings
          WHERE organization_id = ANY($1::uuid[])`,
        [organizationIds]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.course_versions
          WHERE organization_id = ANY($1::uuid[])`,
        [organizationIds]
      );
      await migrationPool.query(
        `DELETE FROM learning_content.courses
          WHERE id = ANY($1::uuid[])`,
        [courseIds]
      );
      await migrationPool.query(
        `DELETE FROM organizations.organizations
          WHERE id = ANY($1::uuid[])`,
        [organizationIds]
      );
    }

    if (fixtureUserId.length > 0) {
      await migrationPool.query(`DELETE FROM identity.users WHERE id = $1`, [
        fixtureUserId
      ]);
    }
    await migrationPool.end();
  });

  it("lists only active products with active prices and public sellable offerings", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${primaryOrganization.slug}/products`
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");

    const catalog = publicCatalogSchema.parse(JSON.parse(response.body));
    expect(catalog.organization).toEqual({
      slug: primaryOrganization.slug,
      name: "public-catalog-primary organization"
    });
    expect(catalog.products).toHaveLength(1);
    expect(catalog.products[0]?.slug).toBe(publicProductSlug);
    expect(catalog.products[0]?.prices.map((price) => price.id)).toEqual([
      publicPriceEurId,
      publicPriceUsdId
    ]);
    expect(
      catalog.products[0]?.prices.some((price) => price.id === archivedPriceId)
    ).toBe(false);

    const serialized = JSON.stringify(catalog);
    expect(serialized).not.toContain(primaryOrganization.id);
    expect(serialized).not.toContain("organizationId");
    expect(serialized).not.toContain("offeringId");
    expect(serialized).not.toContain("productId");
    expect(serialized).not.toContain("courseVersionId");
    expect(serialized).not.toContain('"status"');
    expect(serialized).not.toContain("createdAt");
    expect(serialized).not.toContain("archivedAt");
  });

  it("returns a stable organization/product slug detail route with opaque price ids", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${primaryOrganization.slug}/products/${publicProductSlug}`
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["cache-control"]).toBe("no-store");
    const body = publicCatalogProductResponseSchema.parse(
      JSON.parse(response.body)
    );
    expect(body.organization.slug).toBe(primaryOrganization.slug);
    expect(body.product.slug).toBe(publicProductSlug);
    expect(body.product.prices.map((price) => price.id)).toEqual([
      publicPriceEurId,
      publicPriceUsdId
    ]);
  });

  it("routes identical product slugs by globally unique organization slug", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${secondaryOrganization.slug}/products/${secondaryProductSlug}`
    });

    expect(response.statusCode).toBe(200);
    const body = publicCatalogProductResponseSchema.parse(
      JSON.parse(response.body)
    );
    expect(body.organization.slug).toBe(secondaryOrganization.slug);
    expect(body.product.name).toBe("Same slug, second organization");
    expect(body.product.prices[0]?.amountMinor).toBe(7777);
  });

  it.each([
    ["closed offering", () => closedProductSlug],
    ["membership-only offering", () => membershipProductSlug],
    ["product without active price", () => noActivePriceProductSlug],
    ["archived product", () => archivedProductSlug]
  ])("fails closed for %s", async (_label, productSlug) => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${primaryOrganization.slug}/products/${productSlug()}`
    });
    expect(response.statusCode).toBe(404);
  });

  it("does not expose suspended organizations", async () => {
    const response = await app.inject({
      method: "GET",
      url: `/v1/public/catalog/${suspendedOrganization.slug}/products`
    });
    expect(response.statusCode).toBe(404);

    const publicRows = await appPool.query<{ product_slug: string }>(
      `SELECT product_slug
         FROM commerce.list_public_catalog_offer_rows($1, NULL::text)`,
      [suspendedOrganization.slug]
    );
    expect(publicRows.rows).toHaveLength(0);
  });

  it("keeps direct tenant tables and tenant-id resolver closed while narrow public functions remain callable", async () => {
    const directProducts = await appPool.query<{ id: string }>(
      `SELECT id::text FROM commerce.products WHERE organization_id = $1`,
      [primaryOrganization.id]
    );
    expect(directProducts.rows).toHaveLength(0);

    const resolverPrivilege = await appPool.query<{ can_resolve_id: boolean }>(
      `SELECT has_function_privilege(
         current_user,
         'organizations.resolve_active_public_organization_id(text)',
         'EXECUTE'
       ) AS can_resolve_id`
    );
    expect(resolverPrivilege.rows[0]?.can_resolve_id).toBe(false);

    const publicOrganization = await appPool.query<{ slug: string; name: string }>(
      `SELECT slug, name
         FROM organizations.find_public_organization_by_slug($1)`,
      [primaryOrganization.slug]
    );
    expect(publicOrganization.rows[0]).toEqual({
      slug: primaryOrganization.slug,
      name: "public-catalog-primary organization"
    });

    const publicRows = await appPool.query<{ product_slug: string }>(
      `SELECT product_slug
         FROM commerce.list_public_catalog_offer_rows($1, NULL::text)`,
      [primaryOrganization.slug]
    );
    expect(
      publicRows.rows.some((row) => row.product_slug === publicProductSlug)
    ).toBe(true);
    expect(
      publicRows.rows.some((row) => row.product_slug === archivedProductSlug)
    ).toBe(false);
  });
});
