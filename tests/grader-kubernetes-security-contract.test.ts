import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import {
  GRADER_GVISOR_RUNTIME_CLASS,
  GRADER_SANDBOX_NAMESPACE,
  GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT
} from "../apps/grader-gateway/src/config";

function manifest(name: string): string {
  return readFileSync(resolve("infra/grader/kubernetes", name), "utf8");
}

describe("grader Kubernetes security contract", () => {
  it("keeps code placement constants aligned with protected infrastructure identities", () => {
    expect(manifest("namespace.yaml")).toContain(
      `name: ${GRADER_SANDBOX_NAMESPACE}`
    );
    expect(manifest("runtime-class.yaml")).toContain(
      `name: ${GRADER_GVISOR_RUNTIME_CLASS}`
    );
    expect(manifest("runner-service-account.yaml")).toContain(
      `name: ${GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT}`
    );
    expect(manifest("runner-service-account.yaml")).toContain(
      "automountServiceAccountToken: false"
    );
  });

  it("keeps network, Pod Security, capacity, and RuntimeClass boundaries fail closed", () => {
    const namespace = manifest("namespace.yaml");
    expect(namespace).toContain(
      "pod-security.kubernetes.io/enforce: restricted"
    );

    const network = manifest("network-policy.yaml");
    expect(network).toContain("podSelector: {}");
    expect(network).toContain("- Ingress");
    expect(network).toContain("- Egress");

    const runtimeClass = manifest("runtime-class.yaml");
    expect(runtimeClass).toContain("handler: runsc-nonet");
    expect(runtimeClass).toContain('grader.platform.internal/gvisor: "true"');

    const limits = manifest("limit-range.yaml");
    expect(limits).toContain('cpu: "1"');
    expect(limits).toContain("memory: 512Mi");
    expect(limits).toContain("ephemeral-storage: 512Mi");

    const quota = manifest("resource-quota.yaml");
    expect(quota).toContain('count/jobs.batch: "64"');
    expect(quota).toContain('count/pods: "64"');
  });

  it("keeps admission bound to the immutable sandbox namespace identity and hardened runner shape", () => {
    const admission = manifest("admission-policy.yaml");
    expect(admission).toContain("failurePolicy: Fail");
    expect(admission).toContain(
      `object.spec.runtimeClassName == '${GRADER_GVISOR_RUNTIME_CLASS}'`
    );
    expect(admission).toContain(
      `object.spec.serviceAccountName == '${GRADER_SANDBOX_RUNNER_SERVICE_ACCOUNT}'`
    );
    expect(admission).toContain(
      "object.spec.automountServiceAccountToken == false"
    );
    expect(admission).toContain("object.spec.containers.size() == 1");
    expect(admission).toContain(
      "c.securityContext.readOnlyRootFilesystem == true"
    );
    expect(admission).toContain("!has(s.serviceAccountToken)");
    expect(admission).toContain("object.spec.parallelism == 1");
    expect(admission).toContain("object.spec.completions == 1");
    expect(admission).toContain("object.spec.backoffLimit == 0");
    expect(admission).toContain(
      `kubernetes.io/metadata.name: ${GRADER_SANDBOX_NAMESPACE}`
    );
  });

  it("keeps Gateway RBAC narrow and does not grant mutable Pod or Secret access", () => {
    const rbac = manifest("rbac.yaml");
    expect(rbac).toContain(
      'resources: ["jobs"]\n    verbs: ["create", "get", "delete"]'
    );
    expect(rbac).toContain(
      'resources: ["secrets"]\n    verbs: ["create", "get"]'
    );
    expect(rbac).toContain('resources: ["pods"]\n    verbs: ["get", "list"]');
    expect(rbac).toContain('resources: ["pods/log"]\n    verbs: ["get"]');
    expect(rbac).not.toContain('resources: ["pods"]\n    verbs: ["create"');
    expect(rbac).not.toContain(
      'resources: ["secrets"]\n    verbs: ["create", "get", "delete"'
    );
  });
});
