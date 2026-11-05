# Docker — Грузчик контейнеров

- **Источник полноты:** документация docs.docker.com:
  - Get started, Manuals (Docker Engine, Build — Dockerfile reference и BuildKit, Compose — спецификация compose-файла);
  - CLI reference (`docker` и подкоманды), Security, Networking, Storage (volumes, bind mounts).
- **Индекс:** каждая инструкция Dockerfile, каждый ключ Compose, каждая подкоманда CLI.
- **Стоит на:** Терминал, Операционная система («Изоляция и виртуализация»).
- **Эволюции и союзники:** эволюция → Kubernetes; союзник — CI/CD. Nexus собирает production-образ из `infra/production/Dockerfile`.
- **Способности:**
  - Образы;
  - Контейнеры;
  - Dockerfile;
  - Данные;
  - Сеть;
  - Compose;
  - Безопасность.
- **Объём:** 22 навыка.

## Ветки

### Основа (Основа)
- `docker-what` — контейнер против ВМ, образ, слой, реестр, установка
- `docker-run` — `docker run`: `-d`, `-p`, `-e`, `--name`, `--rm`, `-it`
- `docker-containers` — `ps`, `logs`, `exec`, `stop`, `rm`, `inspect`, жизненный цикл
- `docker-images` — `pull`, `images`, `tag`, `push`, `rmi`, теги и digest

### Dockerfile (Основа)
- `docker-dockerfile-basics` — `FROM`, `RUN`, `COPY`, `WORKDIR`, `CMD`, `ENTRYPOINT`, `EXPOSE`, `ENV`
- `docker-build` — `docker build`, контекст, `.dockerignore`, кэш слоёв
- `docker-dockerfile-full` — `ARG`, `ADD`, `USER`, `HEALTHCHECK`, `LABEL`, `VOLUME`, `SHELL`, `STOPSIGNAL`, `ONBUILD`, exec- и shell-форма

### Хорошие образы (Практика)
- `docker-multistage` — многоэтапная сборка
- `docker-image-size` — маленькие образы: базовые образы (alpine, distroless, slim), порядок слоёв
- `docker-buildkit` — BuildKit: кэш-монтирования, секреты при сборке, `buildx`, мультиплатформенность

### Данные (Практика)
- `docker-volumes` — тома, bind mounts, tmpfs, резервное копирование томов

### Сеть (Практика)
- `docker-networking` — сети bridge, host, none, пользовательские сети, DNS между контейнерами

### Compose (Практика)
- `docker-compose-basics` — `compose.yml`: сервисы, порты, тома, сети, `up`/`down`/`logs`
- `docker-compose-advanced` — `depends_on` с условиями, healthcheck, профили, `env_file`, переопределения, `watch`
- `docker-compose-spec` — спецификация Compose полностью

### Эксплуатация (Продвинутое)
- `docker-resources` — лимиты CPU и памяти, политики перезапуска
- `docker-logs-debug` — драйверы логов, отладка контейнера, `docker events`, `stats`
- `docker-registry` — реестры: Docker Hub, GHCR, приватные; подпись образов

### Безопасность (Продвинутое)
- `docker-security` — non-root, read-only rootfs, capabilities, seccomp, rootless Docker
- `docker-scanning-sbom` — сканирование уязвимостей, SBOM, закрепление по digest (как грейдер Nexus)

### Справочник и изнутри (Полное покрытие)
- `docker-cli-reference` — оставшиеся подкоманды по индексу
- `docker-internals` — containerd, runc, OCI, namespaces и cgroups на практике

**Бои:** контейнеризовать Node-приложение маленьким безопасным образом; Compose-стек приложение + PostgreSQL + Redis с healthcheck; ускорить сборку кэшем. Проверка — грейдер собирает образ и проверяет размер, пользователя и работоспособность.
