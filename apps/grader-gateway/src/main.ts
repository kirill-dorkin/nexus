import Fastify from "fastify";

const app = Fastify({ logger: true });

app.get("/health", async () => ({ status: "ok", service: "grader-gateway" }));

const port = Number(process.env.GRADER_GATEWAY_PORT ?? 4100);
await app.listen({ port, host: "0.0.0.0" });
