import { Injectable, NotFoundException } from "@nestjs/common";
import {
  publicLearningCatalogSchema,
  publicLearningCourseSchema,
  publicLearningLessonSchema
} from "@platform/contracts";
import type { DatabaseTransaction } from "@platform/database";
import { DatabaseService } from "../../database/database.service";
import { PublicOrganizationQuery } from "../organizations/application/public-organization.query";
import { PublicLearningContentQuery } from "../learning-content/application/public-learning-content.query";
import { PublicFreeLearningOfferingQuery } from "../learning-delivery/application/public-free-learning-offering.query";

const snapshot = { isolationLevel: "repeatable_read" as const, readOnly: true };
@Injectable()
export class PublicLearningService {
  constructor(
    private readonly database: DatabaseService,
    private readonly organizations: PublicOrganizationQuery,
    private readonly delivery: PublicFreeLearningOfferingQuery,
    private readonly content: PublicLearningContentQuery
  ) {}

  async list() {
    return this.database.transaction(async (tx) => {
      const addresses = await this.delivery.listAddresses(tx);
      const courses = [];
      for (const address of addresses) {
        const course = await this.composeCourse(
          tx,
          address.organizationSlug,
          address.offeringSlug
        );
        if (course !== null) courses.push(course);
      }
      return publicLearningCatalogSchema.parse({ courses });
    }, snapshot);
  }
  async course(organizationSlug: string, offeringSlug: string) {
    return this.database.transaction(async (tx) => {
      const course = await this.composeCourse(
        tx,
        organizationSlug,
        offeringSlug
      );
      if (course === null)
        throw new NotFoundException("Public learning course not found.");
      return course;
    }, snapshot);
  }
  async lesson(
    organizationSlug: string,
    offeringSlug: string,
    lessonSlug: string
  ) {
    return this.database.transaction(async (tx) => {
      const course = await this.composeCourse(
        tx,
        organizationSlug,
        offeringSlug
      );
      if (course === null)
        throw new NotFoundException("Public learning lesson not found.");
      const lesson = await this.content.readLesson(
        tx,
        organizationSlug,
        offeringSlug,
        lessonSlug
      );
      if (lesson === null)
        throw new NotFoundException("Public learning lesson not found.");
      return publicLearningLessonSchema.parse({ ...course, lesson });
    }, snapshot);
  }
  private async composeCourse(
    tx: DatabaseTransaction,
    organizationSlug: string,
    offeringSlug: string
  ) {
    const organization = await this.organizations.findActiveBySlug(
      tx,
      organizationSlug
    );
    if (organization === null) return null;
    const offering = await this.delivery.findOffering(
      tx,
      organizationSlug,
      offeringSlug
    );
    if (offering === null) return null;
    const course = await this.content.readCourse(
      tx,
      organizationSlug,
      offeringSlug
    );
    if (course === null) return null;
    return publicLearningCourseSchema.parse({
      organization: { slug: organization.slug, name: organization.name },
      offering,
      course
    });
  }
}
