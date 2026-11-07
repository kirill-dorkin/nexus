// Chapter 10: packaging and GitOps — Helm, Kustomize, Argo CD and Flux, operators.
import { idea, sh, yml, tip, makeLesson } from "./kkit.mjs";

export default function gitops(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "helm", title: "Helm", summary: "Чарты, values и шаблоны, установка и обновление релизов, готовые чарты.",
    skill: ["k8s-helm", "Helm", "Устанавливать и параметризовать приложения через Helm."],
    now: "Защитили кластер и упаковываем приложения в пакеты.",
    body: [
      idea("Чарт", "Пакет манифестов", "Шаблоны манифестов плюс файл values с параметрами: число реплик, образ, домен.", "Одно приложение — разные настройки для разных окружений."),
      sh("helm install", "Установить и обновить", "`helm upgrade --install api ./chart -f values.prod.yaml` ставит или обновляет релиз.", "Сложное приложение — одной командой.", "$ helm upgrade --install api ./chart -f values.prod.yaml\nRelease \"api\" has been upgraded. Happy Helming!\nREVISION: 7"),
      idea("Готовые чарты", "Не писать с нуля", "Для nginx-ingress, cert-manager, Prometheus есть официальные чарты.", "Поставить инфраструктуру за минуты."),
      idea("Откат", "helm rollback", "Helm хранит историю релизов: `helm rollback api 6` возвращает прошлую ревизию.", "Быстрый откат целиком."),
      tip("Приложение — чарт с values, инфраструктура — готовые чарты, откат — helm rollback.")
    ],
    quizzes: [
      single("hl-values", "values", "Для чего файл values в Helm?",
        [["params", "Для параметров, которые подставляются в шаблоны"], ["secrets", "Только для секретов"], ["logs", "Для логов"], ["none", "Ни для чего"]], "params",
        "Разные окружения — разные values."),
      single("hl-upgrade", "Установка", "Что делает helm upgrade --install?",
        [["both", "Устанавливает релиз или обновляет, если он уже есть"], ["delete", "Удаляет релиз"], ["build", "Собирает образ"], ["test", "Только тестирует"]], "both",
        "Удобно в конвейере."),
      single("hl-rollback", "Откат", "Как вернуть прошлую ревизию релиза?",
        [["rollback", "`helm rollback имя ревизия`"], ["undo", "`helm undo`"], ["delete", "Удалить и поставить заново"], ["none", "Никак"]], "rollback",
        "История хранится.")
    ]
  });

  L({
    slug: "kustomize", title: "Kustomize", summary: "База и наложения для окружений, патчи без шаблонов, kubectl apply -k.",
    skill: ["k8s-kustomize", "Kustomize", "Настраивать манифесты под окружения через наложения."],
    now: "Знаем Helm и пробуем подход без шаблонов.",
    body: [
      idea("База и наложения", "base и overlays", "Общие манифесты лежат в base, различия окружений — в overlays/dev, overlays/prod как патчи.", "Нет шаблонного языка — обычный YAML."),
      yml("kustomization.yaml", "Что и как менять", "Файл перечисляет ресурсы и патчи: число реплик, тег образа, метки.", "Различия окружений видны в нескольких строках.", "resources:\n  - ../../base\nimages:\n  - name: ghcr.io/team/api\n    newTag: 1.5.0\npatches:\n  - target: { kind: Deployment, name: api }\n    patch: |-\n      - op: replace\n        path: /spec/replicas\n        value: 5"),
      sh("apply -k", "Встроено в kubectl", "`kubectl apply -k overlays/prod` собирает и применяет итоговые манифесты.", "Отдельный инструмент не нужен."),
      idea("Helm или Kustomize", "Что выбрать", "Helm — для распространяемых пакетов с параметрами, Kustomize — для своих приложений с небольшими различиями. Их можно сочетать.", "Выбор по задаче."),
      tip("Свои приложения — base плюс overlays. Пакеты для других — Helm.")
    ],
    quizzes: [
      single("kz-overlay", "Наложения", "Где в Kustomize описывают отличия production?",
        [["overlay", "В наложении overlays/prod с патчами к base"], ["base", "Прямо в base"], ["values", "В values.yaml Helm"], ["env", "В переменных окружения"]], "overlay",
        "Обычный YAML."),
      single("kz-apply", "Применение", "Как применить наложение Kustomize?",
        [["k", "`kubectl apply -k overlays/prod`"], ["f", "`kubectl apply -f kustomize`"], ["helm", "`helm install`"], ["none", "Никак"]], "k",
        "Встроено в kubectl."),
      single("kz-choose", "Выбор", "Когда особенно уместен Helm?",
        [["package", "Для пакетов, которые ставят другие с разными параметрами"], ["never", "Никогда"], ["small", "Только для одного манифеста"], ["db", "Только для баз"]], "package",
        "Свои приложения — часто Kustomize.")
    ]
  });

  L({
    slug: "gitops-tools", title: "GitOps", summary: "Git как источник правды, Argo CD и Flux, синхронизация и дрейф, операторы.",
    skill: ["k8s-gitops", "GitOps", "Управлять кластером через Git."],
    now: "Упаковали приложения и отдаём управление кластером Git.",
    body: [
      idea("Git — источник правды", "Желаемое состояние в репозитории", "Все манифесты кластера лежат в Git. Изменения — только через pull request.", "История, обзор и откат для всего кластера."),
      idea("Argo CD и Flux", "Агент синхронизации", "Агент в кластере следит за репозиторием и приводит кластер к описанному. Конвейеру не нужен доступ к кластеру.", "Меньше ключей снаружи — безопаснее."),
      idea("Дрейф", "Ручные правки откатываются", "Изменил что-то через kubectl руками — агент вернёт как в Git.", "Кластер не расходится с описанием."),
      idea("Операторы", "Знания в коде", "Оператор — контроллер со своими объектами (Postgres, Kafka): создаёт, обновляет, делает бэкапы по описанию.", "Сложная эксплуатация описывается одним манифестом."),
      tip("Кластер — из Git через Argo CD или Flux. Сложные системы — операторами.")
    ],
    quizzes: [
      single("go-source", "Источник правды", "Где в GitOps находится описание желаемого состояния кластера?",
        [["git", "В репозитории Git"], ["etcd", "Только в etcd"], ["wiki", "В вики"], ["head", "В голове администратора"]], "git",
        "Изменения — через PR."),
      single("go-drift", "Дрейф", "Что сделает Argo CD с ручной правкой через kubectl?",
        [["revert", "Вернёт состояние как в Git"], ["keep", "Сохранит и запишет в Git"], ["ignore", "Ничего"], ["crash", "Уронит кластер"]], "revert",
        "Кластер не расходится с описанием."),
      single("go-operator", "Оператор", "Что такое оператор Kubernetes?",
        [["controller", "Контроллер, который управляет сложной системой по её объектам"], ["person", "Дежурный инженер"], ["cli", "Команда kubectl"], ["node", "Узел кластера"]], "controller",
        "CloudNativePG, Strimzi.")
    ]
  });
}
