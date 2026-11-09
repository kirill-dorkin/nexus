// Chapter 9: cluster security — RBAC, network policies, pod security and image policies.
import { idea, yml, tip, makeLesson } from "./kkit.mjs";

export default function security(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "rbac", title: "RBAC", summary: "Role и ClusterRole, RoleBinding, ServiceAccount приложений, наименьшие права, проверка can-i.",
    skill: ["k8s-rbac", "RBAC", "Ограничивать права людей и приложений в кластере."],
    now: "Считаем стоимость и закрываем кластер от лишних прав.",
    body: [
      yml("Role и RoleBinding", "Что и кому", "Role перечисляет разрешённые действия над ресурсами в пространстве имён, RoleBinding выдаёт её пользователю или ServiceAccount.", "Команда видит только свои ресурсы.", "apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata: { name: read-pods, namespace: shop }\nrules:\n  - apiGroups: [\"\"]\n    resources: [pods, pods/log]\n    verbs: [get, list, watch]"),
      idea("ServiceAccount", "Удостоверение приложения", "Поды работают от ServiceAccount. По умолчанию ему почти ничего не нужно — не давай лишнего.", "Взломанный под не управляет кластером."),
      idea("ClusterRole", "На весь кластер", "Права на все пространства имён. cluster-admin — только администраторам кластера.", "Широкие права — главная цель атак."),
      idea("can-i", "Проверить", "`kubectl auth can-i delete pods --as=system:serviceaccount:shop:api` — проверить права до инцидента.", "Видно, что разрешено на самом деле."),
      tip("Права — по ролям и наименьшие. У приложений — свои ServiceAccount без лишнего.")
    ],
    quizzes: [
      single("rb-role", "Role", "Что описывает Role?",
        [["verbs", "Какие действия над какими ресурсами разрешены"], ["user", "Список пользователей"], ["image", "Образ"], ["net", "Сетевые правила"]], "verbs",
        "Выдаёт её RoleBinding."),
      single("rb-sa", "ServiceAccount", "От чьего имени под обращается к API кластера?",
        [["sa", "От имени своего ServiceAccount"], ["admin", "Всегда от администратора"], ["node", "От имени узла"], ["user", "От имени разработчика"]], "sa",
        "Давай ему минимум прав."),
      single("rb-admin", "cluster-admin", "Кому стоит выдавать cluster-admin?",
        [["admins", "Только администраторам кластера"], ["all", "Всем разработчикам"], ["apps", "Всем приложениям"], ["ci", "Каждому шагу CI"]], "admins",
        "Широкие права — главная цель атак.")
    ]
  });

  L({
    slug: "network-policies", title: "Сетевые политики", summary: "По умолчанию всё открыто, запрет по умолчанию, разрешения по меткам, проверка политик.",
    skill: ["k8s-netpol", "Сетевые политики", "Ограничивать сетевой доступ между подами."],
    now: "Ограничили права и закрываем сеть между подами.",
    body: [
      idea("Всё открыто", "По умолчанию", "Без политик любой под может обратиться к любому другому, включая базу.", "Взломанный фронтенд сразу видит базу."),
      yml("Запрет по умолчанию", "default deny", "Политика без правил для всех подов пространства запрещает входящий трафик. Затем разрешают нужное.", "Доступ есть только там, где его явно дали.", "apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata: { name: db-from-api }\nspec:\n  podSelector: { matchLabels: { app: db } }\n  ingress:\n    - from:\n        - podSelector: { matchLabels: { app: api } }\n      ports: [{ port: 5432 }]"),
      idea("Нужен CNI", "Не везде работает", "Политики исполняет сетевой плагин (Calico, Cilium). Без поддержки они просто игнорируются.", "Проверь, что политики действительно применяются."),
      idea("Исходящий трафик", "egress", "Ограничь и исходящие соединения: базе не нужно ходить в интернет.", "Вредонос не сможет выгрузить данные наружу."),
      tip("Запрет по умолчанию, разрешения по меткам, проверь, что CNI их исполняет.")
    ],
    quizzes: [
      single("np-default", "По умолчанию", "Какой сетевой доступ между подами без политик?",
        [["open", "Всё открыто: любой под достучится до любого"], ["closed", "Всё закрыто"], ["ns", "Только внутри пространства имён"], ["dns", "Только DNS"]], "open",
        "Поэтому нужен default deny."),
      single("np-db", "База", "Как разрешить доступ к базе только подам API?",
        [["policy", "NetworkPolicy для подов app=db с разрешением от подов app=api"], ["password", "Только сложным паролем"], ["hide", "Не публиковать сервис"], ["none", "Никак"]], "policy",
        "Разрешение по меткам."),
      single("np-cni", "Исполнение", "Почему политика может не работать?",
        [["cni", "Сетевой плагин кластера не поддерживает политики"], ["yaml", "YAML всегда игнорируется"], ["root", "Нужен root"], ["dns", "Из-за DNS"]], "cni",
        "Calico и Cilium поддерживают.")
    ]
  });

  L({
    slug: "pod-security", title: "Безопасность подов", summary: "Не root, только чтение файловой системы, capabilities, Pod Security Standards, проверка образов.",
    skill: ["k8s-podsec", "Безопасность подов", "Запускать поды с минимальными привилегиями."],
    now: "Закрыли сеть и ограничиваем права самих контейнеров.",
    body: [
      yml("securityContext", "Ограничения контейнера", "runAsNonRoot, readOnlyRootFilesystem, allowPrivilegeEscalation: false и сброс capabilities.", "Взлом приложения не даёт прав в узле.", "securityContext:\n  runAsNonRoot: true\n  runAsUser: 10001\n  readOnlyRootFilesystem: true\n  allowPrivilegeEscalation: false\n  capabilities:\n    drop: [ALL]"),
      idea("Pod Security Standards", "Уровни политики", "Метка на пространстве имён включает уровень privileged, baseline или restricted — опасные поды не создадутся.", "Правила для всех команд сразу."),
      idea("Проверка образов", "Что запускаем", "Политики (Kyverno, Gatekeeper) разрешают только образы из своего реестра, с подписью и без критичных уязвимостей.", "Случайный образ из интернета не попадёт в кластер."),
      idea("Привилегированные поды", "Почти root узла", "privileged: true и монтирование сокета Docker дают власть над узлом.", "Только для системных агентов и осознанно."),
      tip("Не root, только чтение, без capabilities. Уровень restricted и проверка образов.")
    ],
    quizzes: [
      single("ps-root", "Не root", "Что запрещает runAsNonRoot: true?",
        [["root", "Запуск контейнера от root"], ["net", "Сетевые запросы"], ["logs", "Запись логов"], ["cpu", "Использование процессора"]], "root",
        "Меньше прав — меньше ущерб."),
      single("ps-pss", "Стандарты", "Что даёт уровень restricted в Pod Security Standards?",
        [["strict", "Запрещает создавать поды с опасными настройками"], ["speed", "Ускоряет поды"], ["free", "Даёт бесплатные узлы"], ["none", "Ничего"]], "strict",
        "Метка на пространстве имён."),
      single("ps-images", "Образы", "Как не пустить в кластер образ из случайного источника?",
        [["policy", "Политикой Kyverno или Gatekeeper, разрешающей только свой реестр"], ["trust", "Доверять разработчикам"], ["dns", "Через DNS"], ["none", "Никак"]], "policy",
        "И проверка подписи.")
    ]
  });
}
