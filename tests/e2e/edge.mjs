// One origin for the browser, like the production edge: /v1/* goes to the
// API, everything else to the Next.js server. Session cookies are therefore
// first-party exactly as in production.
import { createServer, request } from "node:http";

const port = Number(process.env.EDGE_PORT ?? 3000);
const api = Number(process.env.API_PORT ?? 4000);
const web = Number(process.env.WEB_PORT ?? 3001);

createServer((incoming, outgoing) => {
  const target = incoming.url?.startsWith("/v1/") ? api : web;
  const upstream = request(
    {
      host: "127.0.0.1",
      port: target,
      path: incoming.url,
      method: incoming.method,
      headers: incoming.headers
    },
    (response) => {
      outgoing.writeHead(response.statusCode ?? 502, response.headers);
      response.pipe(outgoing);
    }
  );
  upstream.on("error", () => {
    if (!outgoing.headersSent) outgoing.writeHead(502);
    outgoing.end();
  });
  incoming.pipe(upstream);
}).listen(port, "127.0.0.1", () => {
  console.log(`[e2e-edge] http://localhost:${port} → api :${api}, web :${web}`);
});
