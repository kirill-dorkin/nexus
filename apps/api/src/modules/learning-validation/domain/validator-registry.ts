import { Injectable } from "@nestjs/common";
import type { ValidationEvidenceTrust } from "@platform/contracts";

export type ValidatorRecordingAuthority = "authorized_user" | "system";

export type ValidatorDefinition = Readonly<{
  key: string;
  version: number;
  recordingAuthority: ValidatorRecordingAuthority;
  evidenceTrust: ValidationEvidenceTrust;
}>;

const validatorDefinitions: readonly ValidatorDefinition[] = [
  {
    key: "manual-review",
    version: 1,
    recordingAuthority: "authorized_user",
    evidenceTrust: "trusted"
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
