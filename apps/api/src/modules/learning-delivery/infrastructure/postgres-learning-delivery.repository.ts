import { Injectable } from "@nestjs/common";
import type {
  Enrollment,
  LearningOffering
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";

import {
  LearningDeliveryRepository,
  type NewEnrollment,
  type NewLearningOffering
} from "../application/learning-delivery.repository";

type OfferingRow = {
  id: string;
  organization_id: string;
  course_version_id: string;
  slug: string;
  name: string;
  delivery_mode: LearningOffering["deliveryMode"];
  access_mode: LearningOffering["accessMode"];
  status: LearningOffering["status"];
  starts_at: Date | null;
  ends_at: Date | null;
};

type EnrollmentRow = {
  id: string;
  organization_id: string;
  offering_id: string;
  user_id: string;
  status: Enrollment["status"];
  enrolled_at: Date;
  completed_at: Date | null;
};

function mapOffering(row: OfferingRow): LearningOffering {
  return {
    id: row.id,
    organizationId: row.organization_id,
    courseVersionId: row.course_version_id,
    slug: row.slug,
    name: row.name,
    deliveryMode: row.delivery_mode,
    accessMode: row.access_mode,
    status: row.status,
    startsAt: row.starts_at?.toISOString() ?? null,
    endsAt: row.ends_at?.toISOString() ?? null
  };
}

function mapEnrollment(row: EnrollmentRow): Enrollment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    offeringId: row.offering_id,
    userId: row.user_id,
    status: row.status,
    enrolledAt: row.enrolled_at.toISOString(),
    completedAt: row.completed_at?.toISOString() ?? null
  };
}

const offeringSelect = `id::text,
  organization_id::text,
  course_version_id::text,
  slug,
  name,
  delivery_mode,
  access_mode,
  status,
  starts_at,
  ends_at`;

const enrollmentSelect = `id::text,
  organization_id::text,
  offering_id::text,
  user_id::text,
  status,
  enrolled_at,
  completed_at`;

@Injectable()
export class PostgresLearningDeliveryRepository extends LearningDeliveryRepository {
  async createOffering(
    transaction: DatabaseTransaction,
    offering: NewLearningOffering
  ): Promise<LearningOffering> {
    const result = await transaction.client.query<OfferingRow>(
      `INSERT INTO learning_delivery.learning_offerings
         (id, organization_id, course_version_id, slug, name, delivery_mode,
          access_mode, starts_at, ends_at, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10)
       RETURNING ${offeringSelect}`,
      [
        offering.id,
        offering.organizationId,
        offering.courseVersionId,
        offering.slug,
        offering.name,
        offering.deliveryMode,
        offering.accessMode,
        offering.startsAt,
        offering.endsAt,
        offering.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created learning offering.");
    }
    return mapOffering(row);
  }

  async findOffering(
    transaction: DatabaseTransaction,
    organizationId: string,
    offeringId: string
  ): Promise<LearningOffering | null> {
    const result = await transaction.client.query<OfferingRow>(
      `SELECT ${offeringSelect}
         FROM learning_delivery.learning_offerings
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, offeringId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapOffering(row);
  }

  async createEnrollment(
    transaction: DatabaseTransaction,
    enrollment: NewEnrollment
  ): Promise<Enrollment> {
    const result = await transaction.client.query<EnrollmentRow>(
      `INSERT INTO learning_delivery.enrollments
         (id, organization_id, offering_id, user_id, created_by_user_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${enrollmentSelect}`,
      [
        enrollment.id,
        enrollment.organizationId,
        enrollment.offeringId,
        enrollment.userId,
        enrollment.createdByUserId
      ]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("PostgreSQL did not return the created enrollment.");
    }
    return mapEnrollment(row);
  }

  async findEnrollment(
    transaction: DatabaseTransaction,
    organizationId: string,
    enrollmentId: string
  ): Promise<Enrollment | null> {
    const result = await transaction.client.query<EnrollmentRow>(
      `SELECT ${enrollmentSelect}
         FROM learning_delivery.enrollments
        WHERE organization_id = $1
          AND id = $2`,
      [organizationId, enrollmentId]
    );
    const row = result.rows[0];
    return row === undefined ? null : mapEnrollment(row);
  }
}
