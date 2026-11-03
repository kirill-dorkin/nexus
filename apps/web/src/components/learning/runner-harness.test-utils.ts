import { Window } from "happy-dom";
import { runnerDocument, type LogLine, type RunCheck } from "./js-runner";

/**
 * Runs the exact sandbox document of js-runner.ts in an isolated happy-dom window with
 * JavaScript enabled, and resolves with what the checker posts. Tests only.
 */
export async function runInWindow(options: {
  code: string;
  lang?: "html" | "js" | undefined;
  page?: string | undefined;
  checks: RunCheck[];
  module?: boolean;
}): Promise<{ results: boolean[]; logs: LogLine[] }> {
  const win = new Window({
    settings: {
      enableJavaScriptEvaluation: true,
      suppressInsecureJavaScriptEnvironmentWarning: true
    }
  });
  const token = "test";
  try {
    const answer = new Promise<{ results: boolean[]; logs: LogLine[] }>(
      (resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("the sandbox never answered")),
          8000
        );
        win.addEventListener("message", (event) => {
          const data = (
            event as unknown as {
              data: {
                runnerToken?: string;
                type?: string;
                results: boolean[];
                logs: LogLine[];
              };
            }
          ).data;
          if (data.runnerToken !== token || data.type !== "result") return;
          clearTimeout(timer);
          resolve({ results: data.results, logs: data.logs });
        });
      }
    );
    win.document.write(runnerDocument({ ...options, mode: "check", token }));
    win.document.close();
    return await answer;
  } finally {
    await win.happyDOM.close();
  }
}
