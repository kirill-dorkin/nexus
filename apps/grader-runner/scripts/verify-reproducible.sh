#!/usr/bin/env bash
set -euo pipefail

module_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
repo_root="$(cd "$module_root/../.." && pwd)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT

cd "$module_root"
mkdir -p dist

build_binary() {
  local destination="$1"
  CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build -buildvcs=false -mod=readonly -trimpath -ldflags='-buildid=' \
    -o "$destination" ./cmd/grader-runner
}

build_binary "$tmp_dir/grader-runner-a"
build_binary "$tmp_dir/grader-runner-b"
cmp "$tmp_dir/grader-runner-a" "$tmp_dir/grader-runner-b"
cp "$tmp_dir/grader-runner-a" dist/grader-runner
chmod 0755 dist/grader-runner
binary_digest="$(sha256sum dist/grader-runner | awk '{print $1}')"

cd "$repo_root"
export SOURCE_DATE_EPOCH=0
export BUILDX_METADATA_PROVENANCE=disabled

build_image() {
  local destination="$1"
  docker buildx build \
    --no-cache \
    --platform linux/amd64 \
    --provenance=false \
    --sbom=false \
    --output "type=oci,dest=$destination,rewrite-timestamp=true" \
    apps/grader-runner >/dev/null
}

oci_manifest_digest() {
  tar -xOf "$1" index.json | node -e '
let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => { input += chunk; });
process.stdin.on("end", () => {
  const parsed = JSON.parse(input);
  if (!Array.isArray(parsed.manifests) || parsed.manifests.length !== 1) process.exit(2);
  const digest = parsed.manifests[0]?.digest;
  if (typeof digest !== "string" || !/^sha256:[0-9a-f]{64}$/.test(digest)) process.exit(3);
  process.stdout.write(digest);
});
'
}

build_image "$tmp_dir/grader-runner-a.tar"
build_image "$tmp_dir/grader-runner-b.tar"
image_digest_a="$(oci_manifest_digest "$tmp_dir/grader-runner-a.tar")"
image_digest_b="$(oci_manifest_digest "$tmp_dir/grader-runner-b.tar")"
test "$image_digest_a" = "$image_digest_b"

evidence="$(printf 'GRADER_RUNNER_BINARY_SHA256=%s\nGRADER_RUNNER_IMAGE_DIGEST=%s\n' \
  "$binary_digest" "$image_digest_a")"
printf '%s\n' "$evidence"

if [[ -n "${GRADER_RUNNER_EVIDENCE_FILE:-}" ]]; then
  mkdir -p "$(dirname "$GRADER_RUNNER_EVIDENCE_FILE")"
  printf '%s\n' "$evidence" > "$GRADER_RUNNER_EVIDENCE_FILE"
fi
