# ADR-0009: REST + OpenAPI first

- Status: Accepted

## Decision

Commands/public integrations use versioned REST resources with OpenAPI. Use RFC-style Problem Details for errors. SSE is preferred for one-way status streams; WebSocket only for genuine bidirectional realtime. GraphQL may later exist as a read interface if a measured need appears.

## Consequences

Web, mobile/CLI, GitHub/B2B integrations and future standards adapters share one simple contract surface.
