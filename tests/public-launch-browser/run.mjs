import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const timeoutMs = 120_000;
const diagnosticFile = process.env.PUBLIC_LAUNCH_BROWSER_DIAGNOSTIC_FILE;
let finished = false;
let timedOut = false;
let lastBoundary = "no [browser-launch] boundary observed";

function recordBoundary(line) {
  if (!line.startsWith("[browser-launch]")) return;
  lastBoundary = line.slice(0, 1_000);
}

function forwardOutput(stream, destination) {
  stream.setEncoding("utf8");
  let buffered = "";

  stream.on("data", (chunk) => {
    destination.write(chunk);
    buffered += chunk;

    let newlineIndex = buffered.indexOf("\n");
    while (newlineIndex !== -1) {
      recordBoundary(buffered.slice(0, newlineIndex).replace(/\r$/, ""));
      buffered = buffered.slice(newlineIndex + 1);
      newlineIndex = buffered.indexOf("\n");
    }
  });

  stream.on("end", () => {
    if (buffered.length > 0) {
      recordBoundary(buffered.replace(/\r$/, ""));
    }
  });
}

function writeDiagnostic(outcome, details = {}) {
  if (!diagnosticFile) return;

  try {
    mkdirSync(dirname(diagnosticFile), { recursive: true });
    writeFileSync(
      diagnosticFile,
      `${JSON.stringify(
        {
          outcome,
          lastBoundary,
          ...details
        },
        null,
        2
      )}\n`,
      "utf8"
    );
  } catch (error) {
    console.error(
      `[browser-launch-runner] failed to write diagnostic artifact: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function escapeWorkflowMessage(message) {
  return message
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

const child = spawn(
  process.execPath,
  [
    "--import",
    "./tests/public-launch-browser/fetch-deadline.mjs",
    "--import",
    "./tests/public-launch-browser/cdp-deadline.mjs",
    "--import",
    "./tests/public-launch-browser/lifecycle-deadline.mjs",
    "tests/public-launch-browser/verify.mjs"
  ],
  {
    detached: process.platform !== "win32",
    stdio: ["inherit", "pipe", "pipe"]
  }
);

forwardOutput(child.stdout, process.stdout);
forwardOutput(child.stderr, process.stderr);

const watchdog = setTimeout(() => {
  if (finished) return;
  timedOut = true;
  writeDiagnostic("timeout", { timeoutMs });
  console.error(
    `Public launch browser verification exceeded ${timeoutMs / 1000}s; terminating the verification process group.`
  );
  console.log(
    `::error title=Public launch browser verification timeout::${escapeWorkflowMessage(`Last browser boundary: ${lastBoundary}`)}`
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
  writeDiagnostic("spawn_error", {
    error: error instanceof Error ? error.message : String(error)
  });
  console.error(error);
  process.exitCode = 1;
});

child.on("exit", (code, signal) => {
  finished = true;
  clearTimeout(watchdog);

  if (!timedOut) {
    writeDiagnostic(code === 0 ? "success" : "failure", {
      exitCode: code,
      signal
    });
  }

  if (code === 0) {
    process.exitCode = 0;
    return;
  }
  console.error(
    `Public launch browser verification exited with ${code === null ? `signal ${signal ?? "unknown"}` : `code ${code}`}.`
  );
  process.exitCode = code ?? 1;
});
