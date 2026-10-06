FROM node:24-bookworm-slim AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10.34.5 --activate
COPY . .
RUN pnpm install --frozen-lockfile
ARG PUBLIC_ORIGIN
ENV NEXT_PUBLIC_API_ORIGIN=${PUBLIC_ORIGIN} NEXT_TELEMETRY_DISABLED=1 TURBO_TELEMETRY_DISABLED=1
RUN node infra/production/validate-origin.mjs && printf '%s' "$PUBLIC_ORIGIN" > infra/production/build-origin && pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
COPY --from=build --chown=node:node /app /app
USER node
ENTRYPOINT ["node", "infra/production/entrypoint.mjs"]
CMD ["api"]
