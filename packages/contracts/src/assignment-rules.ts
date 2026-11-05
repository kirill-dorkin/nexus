// Upload rules of a file assignment (ADR-0073) without zod, so the browser can
// check an upload before sending it without loading the validation library.

/** Upload limits of a file assignment (ADR-0073), checked in the browser and on the server. */
export const ASSIGNMENT_LIMITS = {
  maxFiles: 50,
  maxFileBytes: 200 * 1024,
  // Half the API body limit (1 MB), so JSON escaping of the files always fits.
  maxTotalBytes: 512 * 1024,
  maxPathDepth: 5
} as const;

const segment = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** A relative path inside the assignment: no `..`, no backslashes, no empty or hidden segments. */
export function isAssignmentPath(path: string): boolean {
  if (path.length === 0 || path.length > 200) return false;
  const parts = path.split("/");
  return (
    parts.length <= ASSIGNMENT_LIMITS.maxPathDepth &&
    parts.every((part) => segment.test(part) && part !== ".." && part !== ".")
  );
}

/** An exact path, or `dir/*.ext` / `*.ext`: one file name with that extension in that folder. */
export function matchesAllowedFile(path: string, pattern: string): boolean {
  if (!pattern.includes("*")) return path === pattern;
  const slash = pattern.lastIndexOf("/");
  const folder = slash < 0 ? "" : pattern.slice(0, slash + 1);
  const name = pattern.slice(slash + 1);
  if (!name.startsWith("*.") || name.slice(1).includes("*")) return false;
  const extension = name.slice(1);
  if (!path.startsWith(folder)) return false;
  const rest = path.slice(folder.length);
  return (
    !rest.includes("/") &&
    rest.endsWith(extension) &&
    rest.length > extension.length
  );
}

/** Why an upload cannot be checked, or an empty list. Same rules in the browser and the API. */
export function uploadProblems(
  files: Readonly<Record<string, string>>,
  spec: Readonly<{ entry: string; allowedFiles: readonly string[] }>
): string[] {
  const problems: string[] = [];
  const paths = Object.keys(files);
  if (paths.length > ASSIGNMENT_LIMITS.maxFiles)
    problems.push(`too_many_files`);
  let total = 0;
  for (const path of paths) {
    const bytes = new TextEncoder().encode(files[path] ?? "").length;
    total += bytes;
    if (!isAssignmentPath(path)) problems.push(`bad_path:${path}`);
    else if (
      !spec.allowedFiles.some((pattern) => matchesAllowedFile(path, pattern))
    )
      problems.push(`not_allowed:${path}`);
    if (bytes > ASSIGNMENT_LIMITS.maxFileBytes)
      problems.push(`file_too_large:${path}`);
  }
  if (total > ASSIGNMENT_LIMITS.maxTotalBytes) problems.push("too_large");
  if (files[spec.entry] === undefined)
    problems.push(`missing_entry:${spec.entry}`);
  return problems;
}
