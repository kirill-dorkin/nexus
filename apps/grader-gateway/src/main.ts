import { GraderExecutionProfileRegistry } from "@platform/contracts/grader";

import { createGraderGateway } from "./app.js";
import { loadGraderGatewayRuntimeConfig } from "./config.js";
import { KubernetesGvisorSandboxProvider } from "./kubernetes-gvisor-sandbox-provider.js";
import { UnavailableSandboxProvider } from "./sandbox-provider.js";

const config = loadGraderGatewayRuntimeConfig();
const profileRegistry = new GraderExecutionProfileRegistry(config.profiles);
const sandboxProvider =
  config.sandboxProvider.kind === "kubernetes-gvisor"
    ? new KubernetesGvisorSandboxProvider(config.sandboxProvider.config)
    : new UnavailableSandboxProvider();

const app = createGraderGateway({
  serviceToken: config.serviceToken,
  profileRegistry,
  sandboxProvider,
  logger: true
});

app.log.info(
  {
    sandboxProvider: config.sandboxProvider.kind,
    executionProfileCount: config.profiles.length
  },
  "grader gateway runtime configured"
);

await app.listen({ port: config.port, host: "0.0.0.0" });
