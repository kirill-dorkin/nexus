# Kubernetes — Капитан флота

- **Источник полноты:** документация kubernetes.io: Concepts (Workloads, Services/Networking, Storage, Configuration, Security, Policies, Scheduling, Cluster Architecture), Tasks, Reference (API ресурсов, `kubectl`). Ориентир — программа CKAD и основы CKA.
- **Стоит на:** Docker (ранг Практик — эволюция), Сеть и HTTP.
- **Союзники:** CI/CD. Грейдер Nexus рассчитан на Kubernetes с gVisor.
- **Способности:**
  - Рабочие нагрузки;
  - Сеть;
  - Конфигурация;
  - Хранилище;
  - Безопасность;
  - Масштабирование;
  - Эксплуатация.
- **Объём:** 24 навыка.

## Ветки

### Основа (Основа)
- `k8s-what` — архитектура: control plane, узлы, kubelet, etcd, декларативная модель
- `k8s-kubectl` — `kubectl`: `get`, `describe`, `apply`, `delete`, `logs`, `exec`, контексты
- `k8s-pods` — поды, манифесты YAML, init-контейнеры, sidecar-контейнеры

### Рабочие нагрузки (Основа)
- `k8s-deployments` — Deployment, ReplicaSet, обновления и откаты
- `k8s-statefulsets-daemonsets` — StatefulSet, DaemonSet
- `k8s-jobs` — Job, CronJob

### Сеть (Практика)
- `k8s-services` — Service: ClusterIP, NodePort, LoadBalancer, headless
- `k8s-ingress-gateway` — Ingress и Gateway API
- `k8s-network-policies` — NetworkPolicy, DNS в кластере

### Конфигурация (Практика)
- `k8s-configmaps-secrets` — ConfigMap, Secret, переменные и тома
- `k8s-probes` — liveness, readiness и startup-пробы
- `k8s-resources` — requests и limits, QoS, LimitRange, ResourceQuota

### Хранилище (Практика)
- `k8s-storage` — Volume, PersistentVolume, PVC, StorageClass

### Планирование (Продвинутое)
- `k8s-scheduling` — nodeSelector, affinity и anti-affinity, taints и tolerations, priority
- `k8s-autoscaling` — HPA, VPA (обзор), cluster autoscaler

### Безопасность (Продвинутое)
- `k8s-rbac` — ServiceAccount, Role, ClusterRole, Binding
- `k8s-pod-security` — securityContext, Pod Security Standards, runtimeClass (gVisor)
- `k8s-secrets-supply-chain` — шифрование секретов, политики образов

### Доставка (Практика)
- `k8s-helm-kustomize` — Helm-чарты, Kustomize
- `k8s-gitops` — GitOps: Argo CD и Flux (обзор)

### Эксплуатация (Продвинутое)
- `k8s-observability` — логи, метрики, events, `kubectl top`, Prometheus (обзор)
- `k8s-troubleshooting` — CrashLoopBackOff, ImagePullBackOff, Pending — метод диагностики
- `k8s-cluster-ops` — локальные кластеры (kind, minikube), обновления, резервные копии etcd (обзор)

### Справочник (Полное покрытие)
- `k8s-api-reference` — остальные ресурсы и поля API по индексу, CRD и операторы (обзор)

**Бои:** развернуть приложение с БД, пробами и Ingress; починить сломанный деплой; настроить RBAC и NetworkPolicy. Проверка — грейдер поднимает kind-кластер и проверяет состояние ресурсов.
