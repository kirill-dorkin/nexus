import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication
} from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { registerRouteBodyLimits } from "./http/body-limits";
import { optionalConfiguredWebOrigin } from "./http/web-app-origin";

/** The Nest application type, exported so tests outside this package need not resolve Nest themselves. */
export type ApiApplication = NestFastifyApplication;

export async function createApiApplication(): Promise<ApiApplication> {
  const adapter = new FastifyAdapter();
  registerRouteBodyLimits(adapter);
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { rawBody: true }
  );
  app.setGlobalPrefix("v1");
  app.enableShutdownHooks();

  const webOrigin = optionalConfiguredWebOrigin();
  if (webOrigin !== null) {
    app.enableCors({
      origin: webOrigin,
      credentials: true,
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH"]
    });
  }

  const swagger = new DocumentBuilder()
    .setTitle("Learning Platform API")
    .setVersion("1.0")
    .build();
  SwaggerModule.setup(
    "openapi",
    app,
    SwaggerModule.createDocument(app, swagger),
    {
      ui: false,
      raw: ["json"]
    }
  );

  return app;
}
