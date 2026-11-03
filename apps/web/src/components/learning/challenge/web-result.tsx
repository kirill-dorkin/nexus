import type { RefObject } from "react";
import { runnerDocument } from "../js-runner";
import codeStyles from "../code.module.css";
import styles from "../challenge.module.css";
import type { Challenge, ChallengeCheck } from "./model";

/**
 * The learner's page. Static HTML renders in a script-less sandbox; runnable
 * code runs in an opaque-origin sandbox, with a hidden second frame for checks.
 */
export function WebResult({
  challenge,
  code,
  lang,
  runnable,
  preview,
  token,
  checks,
  checkFrame
}: {
  challenge: Challenge;
  code: string;
  lang: "html" | "js";
  runnable: boolean;
  preview: string;
  token: string;
  checks: ChallengeCheck[];
  checkFrame: RefObject<HTMLIFrameElement | null>;
}) {
  const title = `Результат задания «${challenge.title}»`;
  return (
    <div className={`${codeStyles.frameWrap} ${styles.frameWrap}`}>
      {runnable ? (
        <iframe
          className={codeStyles.frame}
          title={title}
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={runnerDocument({
            code,
            lang,
            page: challenge.page,
            mode: "preview",
            token: preview
          })}
        />
      ) : (
        <iframe
          className={codeStyles.frame}
          title={title}
          sandbox=""
          referrerPolicy="no-referrer"
          srcDoc={code}
        />
      )}
      {runnable && checks.length ? (
        <iframe
          ref={checkFrame}
          hidden
          aria-hidden="true"
          tabIndex={-1}
          title="Проверка задания"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
          srcDoc={runnerDocument({
            code,
            lang,
            page: challenge.page,
            mode: "check",
            token,
            checks
          })}
        />
      ) : null}
    </div>
  );
}
