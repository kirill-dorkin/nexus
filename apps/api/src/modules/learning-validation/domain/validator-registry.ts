import { Injectable } from "@nestjs/common";
import type { ValidationEvidenceTrust } from "@platform/contracts";

export type ValidatorRecordingAuthority = "authorized_user" | "system" | "deterministic_quiz";

export type ValidatorDefinition = Readonly<{
  key: string;
  version: number;
  recordingAuthority: ValidatorRecordingAuthority;
  evidenceTrust: ValidationEvidenceTrust;
  grader?: Readonly<{
    protocolVersion: 1;
    sourceEnvelope: "files_v1";
  }>;
}>;

const validatorDefinitions: readonly ValidatorDefinition[] = [
  ...["quiz.single_choice", "quiz.multiple_choice", "quiz.short_text"].map(key => ({
    key, version: 1, recordingAuthority: "deterministic_quiz" as const, evidenceTrust: "trusted" as const
  })),
  {
    key: "manual-review",
    version: 1,
    recordingAuthority: "authorized_user",
    evidenceTrust: "trusted"
  },
  {
    key: "code-grader",
    version: 1,
    recordingAuthority: "system",
    evidenceTrust: "trusted",
    grader: {
      protocolVersion: 1,
      sourceEnvelope: "files_v1"
    }
  }
];

@Injectable()
export class ValidatorRegistry {
  find(key: string, version: number): ValidatorDefinition | null {
    return (
      validatorDefinitions.find(
        (definition) => definition.key === key && definition.version === version
      ) ?? null
    );
  }
}
