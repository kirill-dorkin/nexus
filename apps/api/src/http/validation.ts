import { BadRequestException } from "@nestjs/common";

type ValidationIssue = Readonly<{
  path: readonly PropertyKey[];
  message: string;
}>;

type SafeParseResult<T> =
  | Readonly<{ success: true; data: T }>
  | Readonly<{
      success: false;
      error: Readonly<{ issues: readonly ValidationIssue[] }>;
    }>;

type SafeParser<T> = Readonly<{
  safeParse(input: unknown): SafeParseResult<T>;
}>;

export function parseRequest<T>(schema: SafeParser<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw new BadRequestException({
    message: "Request validation failed.",
    issues: result.error.issues.map((issue) => ({
      path: issue.path.map(String).join("."),
      message: issue.message
    }))
  });
}
