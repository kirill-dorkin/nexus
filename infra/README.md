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
