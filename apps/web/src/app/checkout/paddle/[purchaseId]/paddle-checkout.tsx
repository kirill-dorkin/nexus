"use client";

import Script from "next/script";
import { useRef, useState } from "react";

import styles from "./checkout.module.css";

type PaddleApi = Readonly<{
  Environment: { set(environment: "sandbox"): void };
  Initialize(options: {
    token: string;
    checkout: {
      settings: {
        displayMode: "overlay";
        locale: "ru";
        theme: "light";
        successUrl: string;
      };
    };
  }): void;
  Checkout: {
    open(options: {
      transactionId: string;
      settings: { successUrl: string };
    }): void;
  };
}>;

declare global {
  interface Window {
    Paddle?: PaddleApi;
  }
}

function transactionIdFromLocation(): string | null {
  const value = new URLSearchParams(window.location.search).get("_ptxn");
  return value !== null && /^txn_[a-z\d]{26}$/.test(value) ? value : null;
}

export function PaddleCheckout({ purchaseId }: Readonly<{ purchaseId: string }>) {
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Загружаем защищённую форму оплаты…");

  function startCheckout() {
    if (started.current) return;
    const paddle = window.Paddle;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    const environment = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT;
    const transactionId = transactionIdFromLocation();

    if (paddle === undefined) {
      setError("Не удалось загрузить Paddle Checkout.");
      return;
    }
    if (token === undefined || token.trim().length === 0) {
      setError("Paddle Checkout не настроен для этого окружения.");
      return;
    }
    if (environment !== "sandbox" && environment !== "production") {
      setError("Некорректно настроено окружение Paddle Checkout.");
      return;
    }
    if (transactionId === null) {
      setError("Ссылка оплаты недействительна или неполна.");
      return;
    }

    const successUrl = `${window.location.origin}/purchases/${purchaseId}`;
    try {
      if (environment === "sandbox") {
        paddle.Environment.set("sandbox");
      }
      paddle.Initialize({
        token: token.trim(),
        checkout: {
          settings: {
            displayMode: "overlay",
            locale: "ru",
            theme: "light",
            successUrl
          }
        }
      });
      paddle.Checkout.open({
        transactionId,
        settings: { successUrl }
      });
      started.current = true;
      setStatus("Форма оплаты открыта. Не закрывайте страницу до завершения.");
    } catch {
      setError("Не удалось открыть Paddle Checkout. Обновите страницу и повторите попытку.");
    }
  }

  return (
    <div className={styles.statusBox} aria-live="polite">
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={startCheckout}
        onError={() => setError("Не удалось загрузить Paddle Checkout.")}
      />
      {error === null ? (
        <p>{status}</p>
      ) : (
        <p className={styles.error} role="alert">{error}</p>
      )}
    </div>
  );
}
