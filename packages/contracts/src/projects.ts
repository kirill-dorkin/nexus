import { z } from "zod";

export const projectNameSchema = z.string().min(1).max(180);
