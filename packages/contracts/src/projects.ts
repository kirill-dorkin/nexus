import { z } from "zod";
import { uuidSchema } from "./common";

export const projectNameSchema = z.string().trim().min(1).max(180);
export const projectTeamNameSchema = z.string().trim().min(1).max(160);
export const projectIdSchema = uuidSchema;
export const projectTeamIdSchema = uuidSchema;

export const createProjectRequestSchema = z.object({
  name: projectNameSchema,
  teamId: projectTeamIdSchema
});

export const createProjectTeamRequestSchema = z.object({
  name: projectTeamNameSchema
});
