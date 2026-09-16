import { createGraderGateway } from "./app.js";

const serviceToken = process.env.GRADER_GATEWAY_SERVICE_TOKEN;
if (serviceToken === undefined || serviceToken.length === 0) {
  throw new Error("GRADER_GATEWAY_SERVICE_TOKEN is required.");
}

const app = createGraderGateway({ serviceToken, logger: true });
const port = Number(process.env.GRADER_GATEWAY_PORT ?? 4100);
await app.listen({ port, host: "0.0.0.0" });
