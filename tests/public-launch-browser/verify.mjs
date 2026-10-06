import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer as createHttpServer, request as httpRequest } from "node:http";
import { createServer as createHttpsServer } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";

const WEB_ORIGIN = "https://127.0.0.1:3443";
const OTHER_WEB_ORIGIN = "https://127.0.0.1:3444";
const API_ORIGIN = "https://127.0.0.1:4443";
const WEB_BACKEND_PORT = 3000;
const API_BACKEND_PORT = 4000;
const FAKE_API_PORT = 4100;
const CHROME_DEBUG_PORT = 9222;

const PURCHASE_ID = "11111111-1111-4111-8111-111111111111";
const PRICE_ID = "22222222-2222-4222-8222-222222222222";
const ERROR_PURCHASE_ID = "33333333-3333-4333-8333-333333333333";
const TRANSACTION_ID = "txn_1234567890abcdefghijklmnop";
const PASSWORD = "BrowserVerification!12345";
const MAX_LOG_CHARS = 12_000;

const children = [];
const servers = [];
let apiLog = "";
let webLog = "";
let purchaseReads = 0;
let checkoutIdempotencyKey = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function commandPath(command) {
  const result = spawnSync("sh", ["-lc", `command -v ${command}`], {
    encoding: "utf8"
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function resolveChromePath() {
  const configured = process.env.CHROME_BIN?.trim();
  if (configured) return configured;

  for (const candidate of [
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser"
  ]) {
    const resolved = commandPath(candidate);
    if (resolved) return resolved;
  }

  const macChrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  if (spawnSync("test", ["-x", macChrome]).status === 0) return macChrome;

  throw new Error(
    "Chrome/Chromium is required for public-launch browser verification. Set CHROME_BIN to its executable path."
  );
}

function appendLog(current, chunk) {
  const next = `${current}${String(chunk)}`;
  return next.length > MAX_LOG_CHARS ? next.slice(-MAX_LOG_CHARS) : next;
}

function spawnChild(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ["ignore", "pipe", "pipe"],
    ...options
  });
  children.push(child);
  return child;
}

async function waitForHttp(url, label, attempts = 120) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return;
    } catch {
      // The process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`${label} did not become ready: ${url}`);
}

function allowedCorsHeaders(origin) {
  return origin === WEB_ORIGIN
    ? {
        "access-control-allow-origin": WEB_ORIGIN,
        "access-control-allow-credentials": "true",
        vary: "Origin"
      }
    : {};
}

function sendJson(response, statusCode, body, origin) {
  response.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    ...allowedCorsHeaders(origin)
  });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let raw = "";
  for await (const chunk of request) raw += chunk;
  return raw.length === 0 ? {} : JSON.parse(raw);
}

function fakePurchase(
  status,
  idempotencyKey = checkoutIdempotencyKey ?? "44444444-4444-4444-8444-444444444444"
) {
  return {
    id: PURCHASE_ID,
    priceId: PRICE_ID,
    status,
    amountMinor: 4900,
    currency: "USD",
    billingType: "one_time",
    idempotencyKey,
    createdAt: "2026-10-04T12:00:00.000Z",
    paidAt: status === "paid" ? "2026-10-04T12:01:00.000Z" : null
  };
}

async function listen(server, port) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  servers.push(server);
}

let learningCatalogEmpty = false;
const learningCourse = {
  organization: { slug: "acme", name: "Acme Academy" },
  offering: { slug: "computer-basics", name: "Computer basics" },
  course: {
    title: "Основы компьютера",
    description: "Видео, конспекты и практика",
    lessons: [
      {
        slug: "introduction",
        title: "Как устроен компьютер",
        summary: "Основные компоненты",
        durationMinutes: 10
      },
      {
        slug: "next-lesson",
        title: "Следующий урок",
        summary: "Продолжаем",
        durationMinutes: 5
      }
    ]
  }
};
const learningLesson = {
  ...learningCourse,
  lesson: {
    ...learningCourse.course.lessons[0],
    blocks: [
      { type: "youtube", videoId: "aqz-KE-bpKQ" },
      {
        type: "markdown",
        markdown:
          "## Конспект\n\n**Процессор** выполняет инструкции. [Справка](https://example.test)\n\n[Unsafe](javascript:alert%281%29)\n\n<script>window.__lessonXss=true</script>\n\n<img src=x onerror=alert(1)>\n\n```js\nconst longLine = '" +
          "long".repeat(100) +
          "';\n```"
      },
      {
        type: "activity",
        title: null,
        kind: "practice",
        required: true,
        activity: {
          slug: "components-check",
          type: "quiz.single_choice",
          title: "Закрепите тему",
          instructions: "Выберите ответ",
          question: "Что выполняет инструкции?",
          options: [
            { id: "cpu", text: "Процессор" },
            { id: "ram", text: "Память" }
          ]
        }
      }
    ]
  }
};

async function startFakeApi() {
  const catalog = {
    organization: {
      slug: "acme",
      name: "Acme Academy",
      customerEntryPolicy: "open"
    },
    product: {
      slug: "course",
      name: "Production TypeScript",
      offering: {
        slug: "production-typescript",
        name: "Production TypeScript",
        deliveryMode: "self_paced",
        startsAt: null,
        endsAt: null
      },
      prices: [
        {
          id: PRICE_ID,
          amountMinor: 4900,
          currency: "USD",
          billingType: "one_time"
        }
      ]
    }
  };

  const server = createHttpServer(async (request, response) => {
    try {
      const origin = request.headers.origin;
      if (request.method === "OPTIONS") {
        response.writeHead(origin === WEB_ORIGIN ? 204 : 403, {
          ...allowedCorsHeaders(origin),
          "access-control-allow-methods": "GET,POST,OPTIONS",
          "access-control-allow-headers": "content-type"
        });
        response.end();
        return;
      }

      const url = new URL(
        request.url ?? "/",
        `http://127.0.0.1:${FAKE_API_PORT}`
      );

      if (request.method === "GET" && url.pathname === "/v1/public/learning") {
        sendJson(
          response,
          200,
          { courses: learningCatalogEmpty ? [] : [learningCourse] },
          origin
        );
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname === "/v1/public/learning/acme/computer-basics"
      ) {
        sendJson(response, 200, learningCourse, origin);
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname ===
          "/v1/public/learning/acme/computer-basics/lessons/introduction"
      ) {
        sendJson(response, 200, learningLesson, origin);
        return;
      }
      if (
        request.method === "GET" &&
        url.pathname ===
          "/v1/public/learning/acme/computer-basics/lessons/next-lesson"
      ) {
        sendJson(
          response,
          200,
          {
            ...learningCourse,
            lesson: {
              ...learningCourse.course.lessons[1],
              blocks: [{ type: "markdown", markdown: "Второй урок" }]
            }
          },
          origin
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === "/v1/public/catalog/acme/products/course"
      ) {
        sendJson(response, 200, catalog, origin);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/v1/public/organizations/acme/memberships/me"
      ) {
        sendJson(response, 200, { status: "active" }, origin);
        return;
      }

      if (
        request.method === "POST" &&
        url.pathname === "/v1/public/catalog/acme/products/course/checkout"
      ) {
        const body = await readJson(request);
        assert(
          body.priceId === PRICE_ID,
          "Browser checkout changed the selected server-known Price identifier."
        );
        assert(
          typeof body.idempotencyKey === "string",
          "Browser checkout omitted its idempotency key."
        );
        checkoutIdempotencyKey = body.idempotencyKey;
        sendJson(
          response,
          201,
          {
            purchase: fakePurchase("pending", body.idempotencyKey),
            checkoutUrl: `${WEB_ORIGIN}/checkout/paddle/${PURCHASE_ID}?_ptxn=${TRANSACTION_ID}`,
            checkoutExpiresAt: null
          },
          origin
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === `/v1/me/purchases/${PURCHASE_ID}`
      ) {
        purchaseReads += 1;
        sendJson(
          response,
          200,
          fakePurchase(purchaseReads >= 2 ? "paid" : "pending"),
          origin
        );
        return;
      }

      if (
        request.method === "GET" &&
        url.pathname === `/v1/me/purchases/${ERROR_PURCHASE_ID}`
      ) {
        sendJson(response, 404, { message: "Not found" }, origin);
        return;
      }

      sendJson(response, 404, { message: "Browser fixture route not found" }, origin);
    } catch (error) {
      sendJson(
        response,
        500,
        { message: error instanceof Error ? error.message : "fixture failure" },
        request.headers.origin
      );
    }
  });

  await listen(server, FAKE_API_PORT);
}

function proxyRequest(request, response, targetPort) {
  const headers = {
    ...request.headers,
    "x-forwarded-proto": "https"
  };
  const upstream = httpRequest(
    {
      host: "127.0.0.1",
      port: targetPort,
      method: request.method,
      path: request.url,
      headers
    },
    (upstreamResponse) => {
      response.writeHead(
        upstreamResponse.statusCode ?? 502,
        upstreamResponse.headers
      );
      upstreamResponse.pipe(response);
    }
  );
  upstream.on("error", (error) => {
    if (!response.headersSent) {
      response.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
    }
    response.end(`proxy error: ${error.message}`);
  });
  request.pipe(upstream);
}

function createCertificate(directory) {
  const configPath = join(directory, "openssl.cnf");
  const keyPath = join(directory, "key.pem");
  const certPath = join(directory, "cert.pem");
  writeFileSync(
    configPath,
    `[req]\ndistinguished_name=dn\nx509_extensions=v3_req\nprompt=no\n[dn]\nCN=127.0.0.1\n[v3_req]\nsubjectAltName=IP:127.0.0.1\nkeyUsage=digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\n`
  );
  execFileSync(
    "openssl",
    [
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-keyout",
      keyPath,
      "-out",
      certPath,
      "-days",
      "1",
      "-config",
      configPath
    ],
    { stdio: "ignore" }
  );
  return { key: readFileSync(keyPath), cert: readFileSync(certPath) };
}

async function startTlsProxies(tls) {
  for (const port of [3443, 3444]) {
    const server = createHttpsServer(tls, (request, response) =>
      proxyRequest(request, response, WEB_BACKEND_PORT)
    );
    await listen(server, port);
  }

  const apiProxy = createHttpsServer(tls, (request, response) => {
    const path = new URL(request.url ?? "/", API_ORIGIN).pathname;
    const useRealApi =
      path.startsWith("/v1/auth/") || path === "/v1/me" || path === "/v1/health";
    proxyRequest(
      request,
      response,
      useRealApi ? API_BACKEND_PORT : FAKE_API_PORT
    );
  });
  await listen(apiProxy, 4443);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();

    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(
            new Error(`${pending.method}: ${message.error.message}`)
          );
        } else {
          pending.resolve(message.result ?? {});
        }
        return;
      }

      for (const listener of this.listeners.get(message.method) ?? []) {
        listener(message.params ?? {});
      }
    });
  }

  static async connect(url) {
    const socket = new WebSocket(url);
    await new Promise((resolve, reject) => {
      socket.addEventListener("open", resolve, { once: true });
      socket.addEventListener("error", reject, { once: true });
    });
    return new CdpClient(socket);
  }

  send(method, params = {}) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject, method });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.listeners.get(method) ?? [];
    listeners.push(listener);
    this.listeners.set(method, listeners);
  }

  waitFor(method, timeoutMs = 20_000) {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error(`Timed out waiting for ${method}`)),
        timeoutMs
      );
      const listener = (params) => {
        clearTimeout(timeout);
        const listeners = this.listeners.get(method) ?? [];
        this.listeners.set(
          method,
          listeners.filter((entry) => entry !== listener)
        );
        resolve(params);
      };
      this.on(method, listener);
    });
  }

  close() {
    this.socket.close();
  }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? "Browser evaluation failed.");
  }
  return result.result?.value;
}

async function waitForExpression(cdp, expression, label, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(cdp, expression)) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${label}.`);
}

async function navigate(cdp, url) {
  const loaded = cdp.waitFor("Page.loadEventFired");
  await cdp.send("Page.navigate", { url });
  await loaded;
}

async function tabUntil(cdp, expression, label, maxTabs = 16) {
  for (let index = 0; index < maxTabs; index += 1) {
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Tab",
      code: "Tab",
      windowsVirtualKeyCode: 9
    });
    if (await evaluate(cdp, expression)) return;
  }
  throw new Error(`Keyboard focus never reached ${label}.`);
}

async function fill(cdp, selector, value) {
  const changed = await evaluate(
    cdp,
    `(() => { const el=document.querySelector(${JSON.stringify(selector)}); if (!(el instanceof HTMLInputElement)) return false; const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value").set; setter.call(el,${JSON.stringify(value)}); el.dispatchEvent(new InputEvent("input",{bubbles:true,inputType:"insertText",data:${JSON.stringify(value)}})); el.dispatchEvent(new Event("change",{bubbles:true})); return true; })()`
  );
  assert(changed, `Could not fill ${selector}.`);
}

async function clickText(cdp, text) {
  const clicked = await evaluate(
    cdp,
    `(() => { const target=[...document.querySelectorAll("button")].find((button)=>button.textContent?.trim()===${JSON.stringify(text)}); if (!(target instanceof HTMLButtonElement)) return false; target.click(); return true; })()`
  );
  assert(clicked, `Could not click button '${text}'.`);
}

async function accessibilityAudit(cdp, label) {
  const { nodes = [] } = await cdp.send("Accessibility.getFullAXTree");
  const interactiveRoles = new Set([
    "button",
    "radio",
    "textbox",
    "link",
    "checkbox",
    "combobox"
  ]);
  const unnamed = nodes.filter((node) => {
    if (node.ignored) return false;
    const role = node.role?.value;
    return (
      interactiveRoles.has(role) &&
      String(node.name?.value ?? "").trim().length === 0
    );
  });
  assert(
    unnamed.length === 0,
    `${label}: unnamed interactive accessibility nodes: ${unnamed
      .map((node) => node.role?.value)
      .join(", ")}`
  );

  const domProblems = await evaluate(
    cdp,
    `(() => { const problems=[]; const ids=[...document.querySelectorAll("[id]")].map((el)=>el.id); const duplicates=ids.filter((id,index)=>id && ids.indexOf(id)!==index); if (duplicates.length) problems.push("duplicate ids: "+[...new Set(duplicates)].join(",")); for (const el of document.querySelectorAll("input,select,textarea")) { if (el.type!=="hidden" && (!el.labels || el.labels.length===0) && !el.getAttribute("aria-label") && !el.getAttribute("aria-labelledby")) problems.push("unlabelled form control"); } return problems; })()`
  );
  assert(domProblems.length === 0, `${label}: ${domProblems.join("; ")}`);
}

async function launchChrome(tempDirectory) {
  const chrome = resolveChromePath();
  const child = spawnChild(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--ignore-certificate-errors",
    `--remote-debugging-port=${CHROME_DEBUG_PORT}`,
    `--user-data-dir=${join(tempDirectory, "chrome-profile")}`,
    "about:blank"
  ]);
  let chromeLog = "";
  child.stderr.on("data", (chunk) => {
    chromeLog = appendLog(chromeLog, chunk);
  });

  await waitForHttp(
    `http://127.0.0.1:${CHROME_DEBUG_PORT}/json/version`,
    "Chrome DevTools",
    80
  ).catch((error) => {
    throw new Error(`${error.message}\nChrome log:\n${chromeLog}`);
  });

  const target = await fetch(
    `http://127.0.0.1:${CHROME_DEBUG_PORT}/json/new?about%3Ablank`,
    { method: "PUT" }
  ).then((response) => response.json());
  return CdpClient.connect(target.webSocketDebuggerUrl);
}

async function runBrowserVerification(cdp) {
  await Promise.all([
    cdp.send("Page.enable"),
    cdp.send("Runtime.enable"),
    cdp.send("Network.enable"),
    cdp.send("Accessibility.enable"),
    cdp.send("Fetch.enable", {
      patterns: [
        {
          urlPattern: "https://cdn.paddle.com/*",
          requestStage: "Request"
        }, { urlPattern: "https://www.youtube-nocookie.com/*", requestStage: "Request" }
      ]
    })
  ]);

  cdp.on("Fetch.requestPaused", (params) => {
    const isVideo = params.request.url.startsWith("https://www.youtube-nocookie.com/");
    const script = isVideo ? "<!doctype html><html><body>Video provider stub</body></html>" :
      "window.Paddle={Environment:{set:function(){}},Initialize:function(){},Checkout:{open:function(options){window.__paddleOpenedSuccessUrl=options.settings.successUrl;}}};";
    void cdp.send("Fetch.fulfillRequest", {
      requestId: params.requestId,
      responseCode: 200,
      responseHeaders: [
        { name: "content-type", value: isVideo ? "text/html; charset=utf-8" : "application/javascript; charset=utf-8" }
      ],
      body: Buffer.from(script).toString("base64")
    });
  });

  console.log("[browser-launch] public learning pages and mobile rendering");
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await navigate(cdp, WEB_ORIGIN);
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Бесплатные курсы") && document.body.innerText.includes("Основы компьютера")',
    "learning homepage"
  );
  await accessibilityAudit(cdp, "learning homepage");
  await navigate(cdp, `${WEB_ORIGIN}/courses`);
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Основы компьютера")',
    "learning catalog"
  );
  await accessibilityAudit(cdp, "learning catalog");
  await navigate(cdp, `${WEB_ORIGIN}/learn/acme/computer-basics`);
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Программа курса")',
    "public course"
  );
  await accessibilityAudit(cdp, "public course");
  await tabUntil(
    cdp,
    'document.activeElement?.textContent === "Начать обучение"',
    "learning start link"
  );
  const courseFocus = await evaluate(
    cdp,
    '({ visible: document.activeElement.matches(":focus-visible"), outline: parseFloat(getComputedStyle(document.activeElement).outlineWidth) })'
  );
  assert(
    courseFocus.visible && courseFocus.outline >= 2,
    "Course start lacks visible keyboard focus."
  );
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13
  });
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp",
    key: "Enter",
    code: "Enter",
    windowsVirtualKeyCode: 13
  });
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Конспект") && document.body.innerText.includes("Закрепите тему")',
    "lesson start navigation"
  );
  await accessibilityAudit(cdp, "public lesson");
  const lessonSafety = await evaluate(
    cdp,
    `({ xss: window.__lessonXss === true, unsafe: !!document.querySelector('main img,main script,main a[href^="javascript:"],main [onerror]'),
    video: document.querySelector('iframe')?.getAttribute('src'), overflow: document.documentElement.scrollWidth > innerWidth,
    code: !!document.querySelector('main pre code'), headings: document.querySelectorAll('main h1').length })`
  );
  assert(
    !lessonSafety.xss && !lessonSafety.unsafe,
    "Lesson Markdown created executable or tracking markup."
  );
  assert(
    lessonSafety.video === "https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ",
    "Lesson changed the canonical embed host/ID."
  );
  assert(
    !lessonSafety.overflow && lessonSafety.code && lessonSafety.headings === 1,
    `Lesson is not contained/readable on mobile: ${JSON.stringify(lessonSafety)}`
  );
  await evaluate(
    cdp,
    `[...document.querySelectorAll('a')].find(a=>a.textContent === 'Следующий урок →').click()`
  );
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Второй урок")',
    "next lesson navigation"
  );
  await evaluate(
    cdp,
    `[...document.querySelectorAll('a')].find(a=>a.textContent === '← Как устроен компьютер').click()`
  );
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Конспект")',
    "previous lesson navigation"
  );
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 1280,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false
  });
  assert(
    !(await evaluate(cdp, "document.documentElement.scrollWidth > innerWidth")),
    "Lesson overflows desktop viewport."
  );
  await navigate(
    cdp,
    `${WEB_ORIGIN}/learn/acme/computer-basics/missing-lesson`
  );
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Курс или урок недоступен")',
    "safe missing lesson"
  );
  learningCatalogEmpty = true;
  await navigate(cdp, `${WEB_ORIGIN}/courses`);
  await waitForExpression(
    cdp,
    'document.body.innerText.includes("Курсы готовятся к открытию")',
    "empty learning catalog"
  );
  learningCatalogEmpty = false;
  console.log("[browser-launch] public learning pages passed");

  await navigate(cdp, `${WEB_ORIGIN}/catalog/acme/products/course`);
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Production TypeScript") && document.body.innerText.includes("Войти")`,
    "public Product checkout UI"
  );
  await accessibilityAudit(cdp, "product/authentication state");

  await tabUntil(
    cdp,
    `document.activeElement?.matches('input[name="price"]') === true`,
    "Price radio"
  );
  const priceFocus = await evaluate(
    cdp,
    `(() => { const input=document.activeElement; const label=input?.closest("label"); if (!label) return null; const style=getComputedStyle(label); return {focusVisible:input.matches(":focus-visible"),outlineWidth:parseFloat(style.outlineWidth)||0,outlineStyle:style.outlineStyle}; })()`
  );
  assert(
    priceFocus?.focusVisible === true,
    "Keyboard-focused Price radio is not :focus-visible."
  );
  assert(
    priceFocus.outlineWidth >= 2 && priceFocus.outlineStyle !== "none",
    "Price option has no visible focus ring."
  );

  await clickText(cdp, "Регистрация");
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Создать аккаунт")`,
    "registration form"
  );
  const email = `browser-${Date.now()}@example.test`;
  await fill(cdp, `input[type="email"]`, email);
  await fill(cdp, `input[autocomplete="name"]`, "Browser Verification");
  await fill(cdp, `input[type="password"]`, PASSWORD);
  await clickText(cdp, "Создать аккаунт");
  await waitForExpression(
    cdp,
    `document.body.innerText.includes(${JSON.stringify(email)})`,
    "authenticated session UI"
  );

  const allowedMe = await evaluate(
    cdp,
    `fetch(${JSON.stringify(`${API_ORIGIN}/v1/me`)},{credentials:"include"}).then(r=>({status:r.status,ok:r.ok})).catch(e=>({error:String(e)}))`
  );
  assert(
    allowedMe.ok === true && allowedMe.status === 200,
    `Exact-origin credentialed CORS failed: ${JSON.stringify(allowedMe)}`
  );

  const { cookies = [] } = await cdp.send("Network.getAllCookies");
  const sessionCookie = cookies.find(
    (cookie) => cookie.httpOnly && cookie.secure && cookie.sameSite === "Strict"
  );
  assert(
    sessionCookie,
    "Browser did not retain a Secure + HttpOnly + SameSite=Strict session cookie."
  );
  const preCheckoutStorage = await evaluate(
    cdp,
    `({cookie:document.cookie,local:Object.keys(localStorage),session:Object.keys(sessionStorage)})`
  );
  assert(
    !preCheckoutStorage.cookie.includes(sessionCookie.name),
    "HttpOnly session cookie became visible to browser JavaScript."
  );
  assert(
    preCheckoutStorage.local.every((key) => !/token|session|bearer/i.test(key)),
    "Browser localStorage contains token-like state."
  );

  await clickText(cdp, "Присоединиться и перейти к оплате");
  await waitForExpression(
    cdp,
    `location.pathname.startsWith("/checkout/paddle/")`,
    "Paddle payment-link page"
  );
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Форма оплаты открыта")`,
    "first-party Paddle loading/open state"
  );
  await accessibilityAudit(cdp, "Paddle payment-link page");
  const paddleSuccessUrl = await evaluate(
    cdp,
    `window.__paddleOpenedSuccessUrl ?? null`
  );
  assert(
    paddleSuccessUrl === `${WEB_ORIGIN}/purchases/${PURCHASE_ID}`,
    "First-party Paddle page changed the canonical reconciliation return locator."
  );

  const postCheckoutStorage = await evaluate(
    cdp,
    `({keys:Object.keys(sessionStorage),values:Object.fromEntries(Object.entries(sessionStorage))})`
  );
  const expectedAttemptKey = `checkout-attempt:acme:course:${PRICE_ID}`;
  assert(
    postCheckoutStorage.keys.filter((key) => key.startsWith("checkout-attempt:")).length === 1,
    "Browser checkout did not keep exactly one attempt key for the selected Price."
  );
  assert(
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      postCheckoutStorage.values[expectedAttemptKey] ?? ""
    ),
    "Browser checkout attempt key is missing or is not a UUID v4."
  );
  assert(
    postCheckoutStorage.keys.every(
      (key) => key.startsWith("checkout-attempt:") || !/token|session|bearer/i.test(key)
    ),
    "Browser sessionStorage contains token-like state."
  );

  await navigate(cdp, `${WEB_ORIGIN}/purchases/${PURCHASE_ID}`);
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Платёж ещё обрабатывается")`,
    "pending reconciliation state"
  );
  await accessibilityAudit(cdp, "pending purchaser reconciliation");
  await tabUntil(
    cdp,
    `document.activeElement?.textContent?.trim()==="Проверить сейчас"`,
    "reconciliation refresh button"
  );
  const refreshFocus = await evaluate(
    cdp,
    `(() => { const style=getComputedStyle(document.activeElement); return {focusVisible:document.activeElement.matches(":focus-visible"),outlineWidth:parseFloat(style.outlineWidth)||0,outlineStyle:style.outlineStyle}; })()`
  );
  assert(
    refreshFocus.focusVisible === true &&
      refreshFocus.outlineWidth >= 2 &&
      refreshFocus.outlineStyle !== "none",
    "Reconciliation refresh button has no visible keyboard focus."
  );
  await clickText(cdp, "Проверить сейчас");
  await waitForExpression(
    cdp,
    `document.body.innerText.includes("Оплата подтверждена платформой")`,
    "paid reconciliation state"
  );
  await accessibilityAudit(cdp, "paid purchaser reconciliation");

  await navigate(cdp, `${WEB_ORIGIN}/purchases/${ERROR_PURCHASE_ID}`);
  await waitForExpression(
    cdp,
    `document.querySelector('[role="alert"]')?.textContent?.includes("Покупка не найдена") === true`,
    "reconciliation error state"
  );
  await accessibilityAudit(cdp, "reconciliation error state");

  await navigate(cdp, `${OTHER_WEB_ORIGIN}/`);
  const blocked = await evaluate(
    cdp,
    `fetch(${JSON.stringify(`${API_ORIGIN}/v1/me`)},{credentials:"include"}).then(()=>"resolved").catch(()=>"blocked")`
  );
  assert(
    blocked === "blocked",
    "A mismatched browser Origin could read the credentialed API response."
  );
  assert(
    checkoutIdempotencyKey === postCheckoutStorage.values[expectedAttemptKey],
    "The browser did not reuse the same attempt key at the checkout boundary."
  );
}

async function closeServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

async function cleanup(tempDirectory, cdp) {
  try {
    cdp?.close();
  } catch {
    // Best-effort browser cleanup.
  }

  for (const child of children) child.kill("SIGTERM");
  await new Promise((resolve) => setTimeout(resolve, 150));
  for (const child of children) {
    if (child.exitCode === null) child.kill("SIGKILL");
  }

  for (const server of servers.reverse()) {
    try {
      await closeServer(server);
    } catch {
      // Best-effort server cleanup.
    }
  }
  rmSync(tempDirectory, { recursive: true, force: true });
}

async function main() {
  const tempDirectory = mkdtempSync(join(tmpdir(), "nexus-browser-launch-"));
  let cdp;

  try {
    await startFakeApi();
    const tls = createCertificate(tempDirectory);
    await startTlsProxies(tls);

    const api = spawnChild("pnpm", ["--filter", "@platform/api", "start"], {
      env: { ...process.env, WEB_APP_ORIGIN: WEB_ORIGIN }
    });
    api.stdout.on("data", (chunk) => {
      apiLog = appendLog(apiLog, chunk);
    });
    api.stderr.on("data", (chunk) => {
      apiLog = appendLog(apiLog, chunk);
    });

    const web = spawnChild(
      "pnpm",
      [
        "--filter",
        "@platform/web",
        "exec",
        "next",
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(WEB_BACKEND_PORT)
      ],
      {
        env: {
          ...process.env,
          NEXT_PUBLIC_API_ORIGIN: API_ORIGIN,
          NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: "test_browser_verification_token",
          NEXT_PUBLIC_PADDLE_ENVIRONMENT: "sandbox",
          NODE_TLS_REJECT_UNAUTHORIZED: "0"
        }
      }
    );
    web.stdout.on("data", (chunk) => {
      webLog = appendLog(webLog, chunk);
    });
    web.stderr.on("data", (chunk) => {
      webLog = appendLog(webLog, chunk);
    });

    await waitForHttp(
      `http://127.0.0.1:${API_BACKEND_PORT}/v1/health`,
      "API"
    ).catch((error) => {
      throw new Error(`${error.message}\nAPI log:\n${apiLog}`);
    });
    await waitForHttp(`http://127.0.0.1:${WEB_BACKEND_PORT}/`, "Web").catch(
      (error) => {
        throw new Error(`${error.message}\nWeb log:\n${webLog}`);
      }
    );

    cdp = await launchChrome(tempDirectory);
    await runBrowserVerification(cdp);
    console.log("Public launch browser verification passed.");
  } catch (error) {
    console.error(error instanceof Error ? error.stack ?? error.message : error);
    if (apiLog) console.error(`\nAPI log tail:\n${apiLog}`);
    if (webLog) console.error(`\nWeb log tail:\n${webLog}`);
    process.exitCode = 1;
  } finally {
    await cleanup(tempDirectory, cdp);
  }
}

await main();
