# Infrastructure

Infrastructure code is intentionally brand-neutral. Environments are infrastructure identities (`local`, `staging`, `production`), not product names.

Planned layout:

```text
infra/
  environments/
    local/
    staging/
    production/
  modules/
    network/
    postgres/
    redis/
    object-storage/
    app-runtime/
    worker-runtime/
    grader-runtime/
    observability/
```

IaC baseline: OpenTofu/Terraform-compatible modules. Kubernetes is explicitly deferred until operational metrics justify it.

The first free-learning production profile and its deployment/access blocker are documented in [learning-deployment.md](../docs/engineering/learning-deployment.md). Runtime artifacts live in `infra/production/`; production grader activation remains separate.
