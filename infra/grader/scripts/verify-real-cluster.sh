#!/usr/bin/env bash
set -euo pipefail

NAMESPACE="platform-grader-sandbox"
RUNTIME_CLASS="platform-gvisor"
RUNNER_SERVICE_ACCOUNT="grader-sandbox-runner"
PROFILE_FILE="${GRADER_PROFILE_FILE:-infra/grader/execution-profiles/js-sum-v1-v1.json}"
RUN_ID="${GRADER_VERIFICATION_RUN_ID:-$(date -u +%Y%m%d%H%M%S)-$$}"
VERIFY_LABEL="grader.platform.internal/verification=${RUN_ID}"
TMP_DIR="$(mktemp -d)"

cleanup() {
  kubectl -n "$NAMESPACE" delete jobs,secrets -l "$VERIFY_LABEL" --ignore-not-found --wait=true >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

die() {
  echo "grader real-cluster verification failed: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "required command '$1' is unavailable"
}

require_file() {
  local path="$1"
  local name="$2"
  [[ -f "$path" && -s "$path" ]] || die "$name must point to a non-empty operator evidence file"
}

require_cmd kubectl
require_cmd node
[[ -f "$PROFILE_FILE" ]] || die "canonical profile file not found: $PROFILE_FILE"
: "${GRADER_RUNNER_IMAGE_REPOSITORY:?GRADER_RUNNER_IMAGE_REPOSITORY is required and must be an untagged repository path}"
: "${GRADER_GVISOR_RUNTIME_EVIDENCE_FILE:?GRADER_GVISOR_RUNTIME_EVIDENCE_FILE is required}"
: "${GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE:?GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE is required}"
require_file "$GRADER_GVISOR_RUNTIME_EVIDENCE_FILE" "GRADER_GVISOR_RUNTIME_EVIDENCE_FILE"
require_file "$GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE" "GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE"

if [[ "$GRADER_RUNNER_IMAGE_REPOSITORY" == *@* || "$GRADER_RUNNER_IMAGE_REPOSITORY" == *:*/*:* ]]; then
  die "GRADER_RUNNER_IMAGE_REPOSITORY must not contain a tag or digest"
fi

CONTEXT="$(kubectl config current-context)"
[[ -n "$CONTEXT" ]] || die "kubectl has no current context"

readarray -t PROFILE_VALUES < <(node - "$PROFILE_FILE" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const parsed = JSON.parse(fs.readFileSync(path, 'utf8'));
if (!Array.isArray(parsed) || parsed.length !== 1) throw new Error('profile manifest must contain exactly one profile');
const p = parsed[0];
if (p.key !== 'js-sum-v1' || p.version !== 1) throw new Error('unexpected canonical profile identity');
if (!/^sha256:[0-9a-f]{64}$/.test(p.runnerImageDigest)) throw new Error('profile image digest is not immutable sha256');
if (JSON.stringify(p.argv) !== JSON.stringify(['/grader-runner', 'js-sum-v1'])) throw new Error('unexpected runner argv');
for (const key of ['wallTimeMs','cpuTimeMs','memoryMiB','pids','outputBytes']) {
  if (!Number.isInteger(p.limits?.[key]) || p.limits[key] <= 0) throw new Error(`invalid ${key}`);
}
console.log(p.runnerImageDigest);
console.log(p.limits.wallTimeMs);
console.log(p.limits.cpuTimeMs);
console.log(p.limits.memoryMiB);
console.log(p.limits.pids);
console.log(p.limits.outputBytes);
NODE
)
[[ "${#PROFILE_VALUES[@]}" -eq 6 ]] || die "could not parse canonical profile"
IMAGE_DIGEST="${PROFILE_VALUES[0]}"
WALL_MS="${PROFILE_VALUES[1]}"
CPU_MS="${PROFILE_VALUES[2]}"
MEMORY_MIB="${PROFILE_VALUES[3]}"
PIDS="${PROFILE_VALUES[4]}"
OUTPUT_BYTES="${PROFILE_VALUES[5]}"
IMAGE="${GRADER_RUNNER_IMAGE_REPOSITORY}@${IMAGE_DIGEST}"

node - "$GRADER_GVISOR_RUNTIME_EVIDENCE_FILE" "$CONTEXT" <<'NODE'
const fs = require('node:fs');
const [path, context] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(path, 'utf8'));
if (value.kubeContext !== context) throw new Error('gVisor evidence does not match current kube context');
if (value.runtimeHandler !== 'runsc-nonet' || value.networkDisabled !== true) throw new Error('gVisor evidence does not prove runsc-nonet with networking disabled');
if (typeof value.verifiedAt !== 'string' || typeof value.evidenceReference !== 'string' || value.evidenceReference.trim() === '') throw new Error('gVisor evidence metadata is incomplete');
NODE

node - "$GRADER_SECRET_ENCRYPTION_EVIDENCE_FILE" "$CONTEXT" <<'NODE'
const fs = require('node:fs');
const [path, context] = process.argv.slice(2);
const value = JSON.parse(fs.readFileSync(path, 'utf8'));
if (value.kubeContext !== context) throw new Error('Secret-encryption evidence does not match current kube context');
if (value.secretsEncryptedAtRest !== true) throw new Error('Secret-encryption evidence is not green');
if (typeof value.verifiedAt !== 'string' || typeof value.evidenceReference !== 'string' || value.evidenceReference.trim() === '') throw new Error('Secret-encryption evidence metadata is incomplete');
NODE

[[ "$(kubectl get namespace "$NAMESPACE" -o jsonpath='{.metadata.labels.pod-security\.kubernetes\.io/enforce}')" == "restricted" ]] || die "sandbox namespace does not enforce restricted Pod Security"
[[ "$(kubectl get runtimeclass "$RUNTIME_CLASS" -o jsonpath='{.handler}')" == "runsc-nonet" ]] || die "platform-gvisor does not resolve to runsc-nonet"
[[ "$(kubectl get runtimeclass "$RUNTIME_CLASS" -o jsonpath='{.scheduling.nodeSelector.grader\.platform\.internal/gvisor}')" == "true" ]] || die "RuntimeClass does not select dedicated gVisor nodes"
[[ "$(kubectl -n "$NAMESPACE" get serviceaccount "$RUNNER_SERVICE_ACCOUNT" -o jsonpath='{.automountServiceAccountToken}')" == "false" ]] || die "runner ServiceAccount token automount is not disabled"

kubectl -n "$NAMESPACE" get networkpolicy default-deny-all >/dev/null
kubectl -n "$NAMESPACE" get resourcequota grader-sandbox-capacity >/dev/null
kubectl -n "$NAMESPACE" get limitrange grader-sandbox-hard-envelope >/dev/null
kubectl get validatingadmissionpolicy platform-grader-sandbox-pods >/dev/null
kubectl get validatingadmissionpolicy platform-grader-sandbox-jobs >/dev/null
kubectl get validatingadmissionpolicybinding platform-grader-sandbox-pods >/dev/null
kubectl get validatingadmissionpolicybinding platform-grader-sandbox-jobs >/dev/null

mapfile -t SANDBOX_NODES < <(kubectl get nodes -l grader.platform.internal/gvisor=true -o jsonpath='{range .items[*]}{.metadata.name}{"\n"}{end}')
[[ "${#SANDBOX_NODES[@]}" -gt 0 ]] || die "no dedicated sandbox nodes carry grader.platform.internal/gvisor=true"
for node in "${SANDBOX_NODES[@]}"; do
  kubectl get node "$node" -o json | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{const n=JSON.parse(s); const ok=(n.spec.taints||[]).some(t=>t.key==="grader.platform.internal/gvisor"&&t.value==="true"&&t.effect==="NoSchedule"); if(!ok) process.exit(2);});
  ' || die "sandbox node $node lacks the dedicated NoSchedule taint"

  configz="$(kubectl get --raw "/api/v1/nodes/${node}/proxy/configz")" || die "cannot read kubelet configz for $node"
  actual_pids="$(printf '%s' "$configz" | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{const v=JSON.parse(s); const c=v.kubeletconfig||v.kubeletConfig||v; const n=c.podPidsLimit; if(!Number.isInteger(n)) process.exit(2); process.stdout.write(String(n));});
  ')" || die "kubelet configz for $node does not expose integer podPidsLimit"
  [[ "$actual_pids" == "$PIDS" ]] || die "node $node podPidsLimit=$actual_pids does not equal profile pids=$PIDS"
done

make_job_yaml() {
  local name="$1"
  local secret="$2"
  local job_id="$3"
  cat <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: ${name}
  namespace: ${NAMESPACE}
  labels:
    grader.platform.internal/verification: "${RUN_ID}"
spec:
  parallelism: 1
  completions: 1
  completionMode: NonIndexed
  backoffLimit: 0
  activeDeadlineSeconds: 30
  ttlSecondsAfterFinished: 300
  template:
    metadata:
      labels:
        grader.platform.internal/verification: "${RUN_ID}"
    spec:
      runtimeClassName: ${RUNTIME_CLASS}
      serviceAccountName: ${RUNNER_SERVICE_ACCOUNT}
      restartPolicy: Never
      terminationGracePeriodSeconds: 1
      automountServiceAccountToken: false
      enableServiceLinks: false
      hostNetwork: false
      hostPID: false
      hostIPC: false
      securityContext:
        runAsNonRoot: true
        runAsUser: 65532
        runAsGroup: 65532
        fsGroup: 65532
        seccompProfile:
          type: RuntimeDefault
      containers:
        - name: runner
          image: ${IMAGE}
          imagePullPolicy: IfNotPresent
          command: ["/grader-runner"]
          args: ["js-sum-v1"]
          env:
            - { name: GRADER_JOB_ID, value: "${job_id}" }
            - { name: GRADER_SOURCE_ROOT, value: "/workspace/source" }
            - { name: GRADER_SCRATCH_ROOT, value: "/workspace/tmp" }
            - { name: GRADER_WALL_TIME_MS, value: "${WALL_MS}" }
            - { name: GRADER_CPU_TIME_MS, value: "${CPU_MS}" }
            - { name: GRADER_PIDS, value: "${PIDS}" }
            - { name: GRADER_OUTPUT_BYTES, value: "${OUTPUT_BYTES}" }
          resources:
            requests: { cpu: "1", memory: "${MEMORY_MIB}Mi", ephemeral-storage: "128Mi" }
            limits: { cpu: "1", memory: "${MEMORY_MIB}Mi", ephemeral-storage: "128Mi" }
          securityContext:
            privileged: false
            allowPrivilegeEscalation: false
            readOnlyRootFilesystem: true
            runAsNonRoot: true
            runAsUser: 65532
            runAsGroup: 65532
            capabilities: { drop: ["ALL"] }
          volumeMounts:
            - { name: source, mountPath: "/workspace/source", readOnly: true }
            - { name: scratch, mountPath: "/workspace/tmp" }
      volumes:
        - name: source
          projected:
            sources:
              - secret:
                  name: ${secret}
                  items:
                    - { key: content, path: main.js, mode: 292 }
        - name: scratch
          emptyDir:
            sizeLimit: 64Mi
EOF
}

VALID_FIXTURE="$TMP_DIR/valid-job.yaml"
make_job_yaml "grader-admission-${RUN_ID}" "grader-admission-source-${RUN_ID}" "sha256:$(printf 'a%.0s' {1..64})" > "$VALID_FIXTURE"
kubectl apply --dry-run=server -f "$VALID_FIXTURE" >/dev/null || die "live admission rejected the hardened reference Job"

sed 's/runtimeClassName: platform-gvisor/runtimeClassName: runc/' "$VALID_FIXTURE" > "$TMP_DIR/weakened-runtime.yaml"
if kubectl apply --dry-run=server -f "$TMP_DIR/weakened-runtime.yaml" >/dev/null 2>&1; then
  die "admission accepted a Job with weakened RuntimeClass"
fi
sed 's/automountServiceAccountToken: false/automountServiceAccountToken: true/' "$VALID_FIXTURE" > "$TMP_DIR/weakened-token.yaml"
if kubectl apply --dry-run=server -f "$TMP_DIR/weakened-token.yaml" >/dev/null 2>&1; then
  die "admission accepted a Job with ServiceAccount token automount"
fi
sed 's/backoffLimit: 0/backoffLimit: 1/' "$VALID_FIXTURE" > "$TMP_DIR/weakened-retry.yaml"
if kubectl apply --dry-run=server -f "$TMP_DIR/weakened-retry.yaml" >/dev/null 2>&1; then
  die "admission accepted a Job with internal retry enabled"
fi

run_case() {
  local case_name="$1"
  local source="$2"
  local expected_outcome="$3"
  local expected_reason="$4"
  local suffix="$(printf '%s' "$case_name" | tr '_' '-')"
  local name="grader-${suffix}-${RUN_ID}"
  local secret="${name}-source"
  local source_b64
  local job_id="sha256:$(printf 'b%.0s' {1..64})"
  local job_yaml="$TMP_DIR/${case_name}.yaml"
  source_b64="$(printf '%s' "$source" | base64 | tr -d '\n')"

  cat <<EOF | kubectl apply -f - >/dev/null
apiVersion: v1
kind: Secret
metadata:
  name: ${secret}
  namespace: ${NAMESPACE}
  labels:
    grader.platform.internal/verification: "${RUN_ID}"
immutable: true
type: Opaque
data:
  content: ${source_b64}
EOF

  make_job_yaml "$name" "$secret" "$job_id" > "$job_yaml"
  kubectl create -f "$job_yaml" >/dev/null
  if kubectl create -f "$job_yaml" >/dev/null 2>&1; then
    die "duplicate Job create unexpectedly succeeded for $case_name"
  fi
  kubectl -n "$NAMESPACE" get job "$name" >/dev/null || die "replay observation could not find existing Job for $case_name"

  kubectl -n "$NAMESPACE" wait --for=condition=complete "job/$name" --timeout=60s >/dev/null || {
    kubectl -n "$NAMESPACE" describe job "$name" >&2 || true
    kubectl -n "$NAMESPACE" logs "job/$name" >&2 || true
    die "runner Job did not complete for $case_name"
  }

  local pod node logs
  pod="$(kubectl -n "$NAMESPACE" get pods -l job-name="$name" -o jsonpath='{.items[0].metadata.name}')"
  [[ -n "$pod" ]] || die "no result Pod found for $case_name"
  node="$(kubectl -n "$NAMESPACE" get pod "$pod" -o jsonpath='{.spec.nodeName}')"
  [[ "$(kubectl get node "$node" -o jsonpath='{.metadata.labels.grader\.platform\.internal/gvisor}')" == "true" ]] || die "runner Pod for $case_name was not placed on a dedicated sandbox node"

  kubectl -n "$NAMESPACE" get pod "$pod" -o json | node -e '
    let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{const p=JSON.parse(s); if(p.spec.automountServiceAccountToken!==false) process.exit(2); const vols=p.spec.volumes||[]; const token=vols.some(v=>v.projected?.sources?.some(x=>x.serviceAccountToken)); if(token) process.exit(3);});
  ' || die "runner Pod for $case_name contains Kubernetes API credentials"

  logs="$(kubectl -n "$NAMESPACE" logs "$pod" -c runner)"
  printf '%s' "$logs" | node - "$job_id" "$expected_outcome" "$expected_reason" <<'NODE'
let input='';
const [jobId, outcome, reason] = process.argv.slice(2);
process.stdin.on('data', d => input += d).on('end', () => {
  const trimmed = input.trim();
  const value = JSON.parse(trimmed);
  if (value.protocolVersion !== 1 || value.jobId !== jobId || value.status !== 'completed' || value.outcome !== outcome) process.exit(2);
  if (reason && value.payload?.reason !== reason) process.exit(3);
  if (Buffer.byteLength(trimmed, 'utf8') > Number(process.env.GRADER_EXPECTED_OUTPUT_BYTES || 1048576)) process.exit(4);
});
NODE
  if [[ "$case_name" == "pass" ]]; then
    [[ "$logs" != *"running learner"* ]] || die "learner console escaped into the control channel"
  fi
}

export GRADER_EXPECTED_OUTPUT_BYTES="$OUTPUT_BYTES"
run_case "pass" 'function solve(input) { console.log("running learner"); return input.a + input.b; }' "passed" ""
run_case "host-api" 'function solve(input) { return process.env; }' "failed" "runtime_error"
run_case "cpu-limit" 'function solve(input) { for (;;) {} }' "failed" "cpu_time_exceeded"
run_case "output-limit" 'function solve(input) { for (var i = 0; i < 100000; i++) console.log("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"); return input.a + input.b; }' "failed" "output_limit_exceeded"

kubectl -n "$NAMESPACE" delete jobs,secrets -l "$VERIFY_LABEL" --ignore-not-found --wait=true >/dev/null
if kubectl -n "$NAMESPACE" get jobs,secrets -l "$VERIFY_LABEL" -o name | grep -q .; then
  die "verification resources remain after cleanup"
fi
trap - EXIT
rm -rf "$TMP_DIR"
echo "grader real-cluster verification passed for context=$CONTEXT digest=$IMAGE_DIGEST"
