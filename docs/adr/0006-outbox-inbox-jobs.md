# ADR-0006: Transactional outbox/inbox around asynchronous work

- Status: Accepted

## Decision

Business state + outbox are written in one PostgreSQL transaction. External retried inputs use durable inbox + idempotency. Redis/BullMQ is an execution queue behind a port, not the source of truth.

## Consequences

A crash after commit cannot silently lose a grader/mastery/GitHub follow-up. All processors must be idempotent and support retries/dead-letter handling.
