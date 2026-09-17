# Real-cluster grader sandbox verification

This gate is for an actual target Kubernetes cluster. It must never be replaced by a simulated gVisor check on a normal GitHub-hosted runner.

## Purpose

Repository tests prove the deterministic Gateway/provider and runner contracts. This procedure independently proves the deployment boundary that the repository cannot infer from source alone: the real RuntimeClass handler, dedicated-node placement, kubelet Pod PID ceiling, fail-closed Pod and Job admission behavior, live default-deny network-policy semantics, live namespace capacity envelopes, credential-free runner ServiceAccount, Secret encryption-at-rest operator evidence, deterministic resource replay behavior, cleanup, and hostile-code execution through the exact digest-pinned runner image.

A green run is release evidence only for the exact Kubernetes context, node pool, profile manifest, runner digest, and operator evidence files used for that run. It does not enable production by itself.

## Prerequisites

Run from the repository root with `kubectl` and Node.js available. The current kube context must point at the target cluster. The sandbox manifests from `infra/grader/kubernetes/` must already be deployed.

The exact runner image identified by `infra/grader/execution-profiles/js-sum-v1-v1.json` must have been published to a deployment-owned OCI repository. Export that repository path without a tag or digest:

```bash
export GRADER_RUNNER_IMAGE_REPOSITORY=registry.example.com/nexus/grader-runner
```

Two controls are not reliably observable through the ordinary Kubernetes object API and therefore require signed/controlled operator evidence rather than an optimistic repository assumption:

- gVisor/containerd handler configuration proving `runsc-nonet` is the handler behind `platform-gvisor` and has runtime networking disabled;
- Kubernetes API/etcd configuration proving Secret data is encrypted at rest.

Create JSON evidence files for the **current kube context**:

```json
{
  "kubeContext": "production-cluster-context",
  "verifiedAt": "2026-09-17T00:00:00Z",
  "runtimeHandler": "runsc-nonet",
  "networkDisabled": true,
  "evidenceReference": "operator-controlled ticket, config snapshot, or attestation reference"
}
```

```json
{
  "kubeContext": "production-cluster-context",
  "verifiedAt": "2026-09-17T00:00:00Z",
  "secretsEncryptedAtRest": true,
  "evidenceReference": "operator-controlled encryption-provider/config attestation reference"
}
```

Then export their paths:

```bash
export GRADER_GVISOR_RUNTIME_EVIDENCE_FILE=/secure/evidence/gvisor-runtime.json
export GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE=/secure/evidence/secret-encryption.json
```

Evidence files must come from the cluster/operator release process, not from this repository and not from a CI fixture generated only to satisfy the script.

## Run

```bash
infra/grader/scripts/verify-real-cluster.sh
```

The script fails closed. It requires the current context and validates the live resources semantically rather than merely checking that named objects exist: `default-deny-all` must select every Pod and deny both ingress and egress with no allow rules; `grader-sandbox-capacity` must match the committed finite ResourceQuota envelope; `grader-sandbox-hard-envelope` must match the committed Container min/max LimitRange; and both grader ValidatingAdmissionPolicies must use `failurePolicy: Fail` with bindings that include `Deny`.

It then reads kubelet `configz` for every dedicated sandbox node and requires `podPidsLimit` to equal the canonical profile's `limits.pids`. Admission is probed at both resource boundaries: a hardened standalone Pod and hardened Job must pass server dry-run, weakened Pods with the wrong RuntimeClass or ServiceAccount-token automount must be rejected by the live Pod policy, and a weakened retrying Job must be rejected by the live Job policy.

Finally, the script actually runs the digest-pinned runner image for pass and hostile-code cases. The hostile cases prove the image/runtime boundary for unavailable host APIs, CPU exhaustion, and output flooding. Each successful result Pod is checked for exact dedicated-node placement and absence of a Kubernetes API token volume. The script verifies create-conflict replay behavior for the same deterministic Job name and explicitly deletes and checks the absence of all verification Jobs, Pods, and Secrets before reporting success.

## Activation rule

A green script result is necessary but not sufficient for production activation. Keep `GRADER_SANDBOX_PROVIDER=unavailable` until a separate deployment change intentionally supplies the exact executable profile, exact published image repository, Gateway credentials/configuration, and a green verification record for the target cluster. Any runner/profile digest change, sandbox-node/runtime change, kubelet PID-limit change, admission/network/capacity change, or Secret-encryption configuration change invalidates the previous record and requires verification again.
