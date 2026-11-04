// Reading and packing the files of a file assignment in the browser (ADR-0073).
// fflate is loaded on demand, only when a learner downloads or uploads.

import { ASSIGNMENT_LIMITS } from "@platform/contracts";

export type Upload = {
  files: Record<string, string>;
  /** Paths left out: folders, binary or oversized files, junk the OS adds. */
  dropped: string[];
};

const decoder = () => new TextDecoder("utf-8", { fatal: true });

function asText(bytes: Uint8Array): string | null {
  try {
    return decoder().decode(bytes);
  } catch {
    return null;
  }
}

const junk = (path: string) =>
  path.startsWith("__MACOSX/") ||
  path.split("/").some((part) => part === ".DS_Store" || part.startsWith("._"));

/** A zip of one folder (`page/index.html`) is read as if the folder were the root. */
function withoutCommonFolder(files: Record<string, string>) {
  const paths = Object.keys(files);
  const first = paths[0]?.split("/")[0];
  if (
    !first ||
    paths.length === 0 ||
    !paths.every((path) => path.startsWith(`${first}/`))
  )
    return files;
  return Object.fromEntries(
    Object.entries(files).map(([path, text]) => [
      path.slice(first.length + 1),
      text
    ])
  );
}

/** Reads a zip or loose files; never inflates an entry above the per-file limit. */
export async function readUpload(selected: readonly File[]): Promise<Upload> {
  const files: Record<string, string> = {};
  const dropped: string[] = [];
  let total = 0;
  for (const file of selected) {
    if (/\.zip$/i.test(file.name)) {
      const { unzipSync } = await import("fflate");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const entries = unzipSync(bytes, {
        filter: (entry) => {
          const keep =
            !entry.name.endsWith("/") &&
            !junk(entry.name) &&
            entry.originalSize <= ASSIGNMENT_LIMITS.maxFileBytes &&
            total + entry.originalSize <= ASSIGNMENT_LIMITS.maxTotalBytes;
          if (keep) total += entry.originalSize;
          else if (!entry.name.endsWith("/") && !junk(entry.name))
            dropped.push(entry.name);
          return keep;
        }
      });
      const inZip: Record<string, string> = {};
      for (const [name, content] of Object.entries(entries)) {
        const text = asText(content);
        if (text === null) dropped.push(name);
        else inZip[name] = text;
      }
      Object.assign(files, withoutCommonFolder(inZip));
      continue;
    }
    if (file.size > ASSIGNMENT_LIMITS.maxFileBytes) {
      dropped.push(file.name);
      continue;
    }
    const text = asText(new Uint8Array(await file.arrayBuffer()));
    if (text === null) dropped.push(file.name);
    else files[file.name] = text;
  }
  return { files, dropped };
}

/** The download: starter files and a README with the task and what will be checked. */
export async function starterZip(
  starterFiles: Readonly<Record<string, string>>,
  readme: string
): Promise<Uint8Array> {
  const { strToU8, zipSync } = await import("fflate");
  const entries: Record<string, Uint8Array> = { "README.md": strToU8(readme) };
  for (const [path, text] of Object.entries(starterFiles))
    entries[path] = strToU8(text);
  return zipSync(entries, { level: 6 });
}

/** Learner-facing text for the problems `uploadProblems` reports. */
export function describeProblem(problem: string, entry: string): string {
  const [code, path] = problem.split(/:(.*)/s);
  switch (code) {
    case "missing_entry":
      return `Нет главного файла ${entry}.`;
    case "not_allowed":
      return `Файл ${path ?? ""} не нужен в этом задании.`;
    case "bad_path":
      return `Недопустимое имя файла: ${path ?? ""}.`;
    case "file_too_large":
      return `Файл ${path ?? ""} больше 200 КБ.`;
    case "too_large":
      return "Все файлы вместе больше 512 КБ.";
    case "too_many_files":
      return "Слишком много файлов: не больше 50.";
    default:
      return "Файлы не подходят для проверки.";
  }
}
