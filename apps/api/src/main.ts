import "reflect-metadata";

import { createApiApplication } from "./app.factory";

async function bootstrap() {
  const app = await createApiApplication();
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen({ port, host: "0.0.0.0" });
}

void bootstrap();
