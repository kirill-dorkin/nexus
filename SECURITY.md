# Security policy

Security является архитектурным требованием, а не релизным чеклистом.

## Базовые правила

- API/worker/grader используют разные runtime identities и credentials.
- Grader не получает production DB credentials, cloud instance credentials или Docker socket.
- Application authorization — основной boundary; PostgreSQL RLS — defense-in-depth.
- Runtime DB role не является superuser и не имеет `BYPASSRLS`.
- Secrets не коммитятся в репозиторий.
- Webhooks проверяют подпись до доверенной обработки и дедуплицируются.
- Upload/download приватных объектов выполняется через short-lived signed URLs.
- Privileged operations попадают в immutable audit trail.

См. `docs/security/baseline.md` и `docs/adr/0007-separate-grader-security-boundary.md`.
