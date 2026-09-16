import { createGraderGateway } from "./app.js";
import { loadGraderGatewayRuntimeConfig } from "./config.js";

const config = await loadGraderGatewayRuntimeConfig();
const app = createGraderGateway({
  serviceToken: config.serviceToken,
  profileRegistry: config.profileRegistry,
  sandboxProvider: config.sandboxProvider,
  logger: true
});

await app.listen({ port: config.port, host: "0.0.0.0" });
