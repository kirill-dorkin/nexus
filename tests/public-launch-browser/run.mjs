import { spawn } from "node:child_process";

const timeoutMs = 120_000;
const child = spawn(
  process.execPath,
  [
    "--import",
    "./tests/public-launch-browser/fetch-deadline.mjs",
    "--import",
    "./tests/public-launch-browser/cdp-deadline.mjs",
    "tests/public-launch-browser/verify.mjs"
  ],
  {
    detached: process.platform !== "win32",
    stdio: "inherit"
  }
);

let finished = false;
const watchdog = setTimeout(() => {
  if (finished) return;
  console.error(
    `Public launch browser verification exceeded ${timeoutMs / 1000}s; terminating the verification process group.`
  );

  if (process.platform === "win32") {
    child.kill("SIGTERM");
  } else {
    try {
      process.kill(-child.pid, "SIGTERM");
    } catch {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    if (finished) return;
    if (process.platform === "win32") {
      child.kill("SIGKILL");
    } else {
      try {
        process.kill(-child.pid, "SIGKILL");
      } catch {
        child.kill("SIGKILL");
      }
    }
  }, 1_000).unref();
}, timeoutMs);

watchdog.unref();

child.on("error", (error) => {
  finished = true;
  clearTimeout(watchdog);
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  finished = true;
  clearTimeout(watchdog);
  if (code === 0) {
    process.exitCode = 0;
    return;
  }
  console.error(
    `Public launch browser verification exited with ${code === null ? `signal ${signal ?? "unknown"}` : `code ${code}`}.`
  );
  process.exitCode = code ?? 1;
});
