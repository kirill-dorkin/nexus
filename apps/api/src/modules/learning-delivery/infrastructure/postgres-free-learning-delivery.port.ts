import { ConflictException, Injectable } from "@nestjs/common";
import type { DatabaseTransaction } from "@platform/database";
import { OutboxRepository } from "../../../outbox/outbox.repository";
import { LearningDeliveryRepository } from "../application/learning-delivery.repository";
import {
  FreeLearningDeliveryPort,
  type FreeLearningRoute
} from "../application/free-learning-delivery.port";
@Injectable()
export class PostgresFreeLearningDeliveryPort extends FreeLearningDeliveryPort {
  constructor(
    private readonly delivery: LearningDeliveryRepository,
    private readonly outbox: OutboxRepository
  ) {
    super();
  }
  async resolve(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ) {
    const r = (
      await tx.client.query<{
        organization_id: string;
        offering_id: string;
        course_version_id: string;
      }>(
        "SELECT * FROM learning_delivery.resolve_free_learning_actor_route($1,$2)",
        [organizationSlug, offeringSlug]
      )
    ).rows[0];
    return r
      ? {
          organizationId: r.organization_id,
          offeringId: r.offering_id,
          courseVersionId: r.course_version_id
        }
      : null;
  }
  async listOwn(tx: DatabaseTransaction, after: string | null) {
    return (
      await tx.client.query<{
        enrollment_id: string;
        organization_slug: string;
        offering_slug: string;
      }>(
        "SELECT * FROM learning_delivery.list_own_free_learning_addresses($1)",
        [after]
      )
    ).rows.map((r) => ({
      enrollmentId: r.enrollment_id,
      organizationSlug: r.organization_slug,
      offeringSlug: r.offering_slug
    }));
  }
  async offering(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    lock = false
  ) {
    if (lock)
      await tx.client.query(
        "SELECT id FROM learning_delivery.learning_offerings WHERE organization_id=$1 AND id=$2 FOR UPDATE",
        [route.organizationId, route.offeringId]
      );
    const o = await this.delivery.findOffering(
      tx,
      route.organizationId,
      route.offeringId
    );
    return o?.status === "open" &&
      o.visibility === "public" &&
      o.accessMode === "membership" &&
      o.deliveryMode === "self_paced" &&
      o.courseVersionId === route.courseVersionId
      ? o
      : null;
  }
  async ownEnrollment(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    userId: string,
    lock = false
  ) {
    const row = (await tx.client.query<{ id: string }>(
      `SELECT id FROM learning_delivery.enrollments WHERE organization_id=$1 AND offering_id=$2 AND user_id=$3 ${lock ? "FOR UPDATE" : ""}`,
      [route.organizationId, route.offeringId, userId]
    )).rows[0];
    return row ? this.delivery.findEnrollment(tx, route.organizationId, row.id) : null;
  }
  async enrollSelf(
    tx: DatabaseTransaction,
    route: FreeLearningRoute,
    userId: string
  ) {
    // The Offering lock serializes self-entry; ON CONFLICT also arbitrates concurrent administrative enrollment.
    const inserted = (
      await tx.client.query<{ id: string }>(
        `INSERT INTO learning_delivery.enrollments(organization_id,offering_id,user_id,created_by_user_id)
       VALUES($1,$2,$3,$3) ON CONFLICT(offering_id,user_id) DO NOTHING RETURNING id`,
        [route.organizationId, route.offeringId, userId]
      )
    ).rows[0];
    const e = await this.ownEnrollment(tx, route, userId);
    if (!e)
      throw new Error("Enrollment insert returned no canonical enrollment.");
    if (e.status !== "active" && e.status !== "completed")
      throw new ConflictException(
        "A terminal enrollment cannot be reactivated through self-entry."
      );
    if (inserted)
      await this.outbox.append(tx, {
        organizationId: route.organizationId,
        eventName: "enrollment.created",
        eventVersion: 1,
        aggregateType: "enrollment",
        aggregateId: e.id,
        actorUserId: userId,
        payload: {
          organizationId: route.organizationId,
          enrollmentId: e.id,
          offeringId: route.offeringId,
          userId
        }
      });
    return e;
  }
}
