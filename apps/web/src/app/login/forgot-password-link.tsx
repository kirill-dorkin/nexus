"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { browserApiRequest } from "../../lib/public-api";
import styles from "./auth.module.css";

/** «Забыли пароль?», shown only when the API can send reset emails (ADR-0082). */
export function ForgotPasswordLink() {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const response = await browserApiRequest("/v1/auth/password-reset");
        const body = response.ok
          ? ((await response.json()) as { available?: unknown })
          : null;
        if (!cancelled) setAvailable(body?.available === true);
      } catch {
        if (!cancelled) setAvailable(false);
      }
    }
    void check();
    return () => {
      cancelled = true;
    };
  }, []);
  if (!available) return null;
  return (
    <Link className={styles.forgot} href="/forgot-password">
      Забыли пароль?
    </Link>
  );
}
