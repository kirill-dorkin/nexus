// Chapter 11: operations — observability, debugging workflow, upgrades and backups.
import { idea, sh, tip, makeLesson } from "./kkit.mjs";

export default function operations(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "observability", title: "Наблюдаемость", summary: "Логи в stdout и сбор логов, метрики Prometheus и Grafana, трассировки, события кластера.",
    skill: ["k8s-observe", "Наблюдаемость", "Собирать логи, метрики и события кластера."],
    now: "Управляем кластером через Git и следим за его состоянием.",
    body: [
      sh("kubectl logs", "Логи пода", "`kubectl logs deploy/api -f`, `--previous` — логи упавшего контейнера.", "Причину падения видно в последних строках.", "$ kubectl logs api-7d9f8c6b5d-2xk4p --previous | tail -2\nError: connect ECONNREFUSED 10.96.12.5:5432\n    at TCPConnectWrap.afterConnect"),
      idea("Сбор логов", "Всё в одно место", "DaemonSet (Fluent Bit, Vector) собирает логи со всех узлов в Loki или Elasticsearch.", "Логи удалённых подов не пропадают."),
      idea("Метрики", "Prometheus и Grafana", "Prometheus собирает метрики подов и кластера, Grafana рисует графики и тревоги.", "Видно нагрузку, ошибки и ресурсы."),
      sh("События", "kubectl get events", "`kubectl get events --sort-by=.lastTimestamp` — что делал кластер: планирование, ошибки образов, OOM.", "Часто ответ здесь, а не в логах."),
      tip("Логи — в stdout и в общее хранилище, метрики — Prometheus, события кластера — get events.")
    ],
    quizzes: [
      single("ob-prev", "Упавший контейнер", "Как посмотреть логи контейнера до его перезапуска?",
        [["previous", "`kubectl logs pod --previous`"], ["old", "`kubectl logs --old`"], ["describe", "Только describe"], ["none", "Никак"]], "previous",
        "Причина падения — в конце."),
      single("ob-collect", "Сбор логов", "Зачем собирать логи в общее хранилище?",
        [["keep", "Логи удалённых подов не пропадают, по ним можно искать"], ["speed", "Для скорости подов"], ["cost", "Это бесплатно"], ["none", "Незачем"]], "keep",
        "Fluent Bit, Loki."),
      single("ob-events", "События", "Где увидеть ошибки скачивания образа и планирования?",
        [["events", "В событиях кластера: kubectl get events"], ["logs", "Только в логах приложения"], ["git", "В Git"], ["dns", "В DNS"]], "events",
        "Или в describe.")
    ]
  });

  L({
    slug: "debugging", title: "Порядок отладки", summary: "Pending, ImagePullBackOff, CrashLoopBackOff, нет трафика — что проверять по шагам, kubectl debug.",
    skill: ["k8s-debug", "Отладка", "Находить причину типичных проблем в кластере."],
    now: "Видим логи и метрики и разбираем типичные поломки по шагам.",
    body: [
      idea("Pending", "Не запускается", "Нет подходящего узла: не хватает ресурсов, не подходит селектор, нет свободного диска. Смотри Events в describe.", "Чаще всего — слишком большие requests."),
      idea("ImagePullBackOff", "Нет образа", "Опечатка в теге, нет доступа к закрытому реестру (imagePullSecrets), образ под другую архитектуру.", "Проверь имя образа и доступ."),
      idea("CrashLoopBackOff", "Падает при старте", "Ошибка в приложении или настройках: logs --previous покажет причину.", "Часто — нет переменной окружения или базы."),
      idea("Нет трафика", "Цепочка", "Ingress → Service → endpoints → поды → readiness. `kubectl get endpoints api` пустой — селектор не совпадает или поды не готовы.", "Иди по цепочке от входа к поду."),
      sh("kubectl debug", "Отладочный контейнер", "`kubectl debug -it pod/api --image=busybox --target=api` подключает временный контейнер к работающему поду.", "Отладка образов без оболочки (distroless)."),
      tip("Pending — ресурсы, ImagePull — образ, CrashLoop — logs --previous, нет трафика — endpoints.")
    ],
    quizzes: [
      single("db-pull", "ImagePullBackOff", "Частая причина ImagePullBackOff?",
        [["image", "Опечатка в имени или теге образа, нет доступа к реестру"], ["cpu", "Мало процессора"], ["dns", "Неверный DNS приложения"], ["probe", "Проверка готовности"]], "image",
        "Проверь имя и imagePullSecrets."),
      single("db-endpoints", "Нет трафика", "Сервис есть, но запросы не доходят. Что проверить?",
        [["endpoints", "kubectl get endpoints: совпадает ли селектор и готовы ли поды"], ["reboot", "Перезагрузить кластер"], ["delete", "Удалить namespace"], ["none", "Ничего"]], "endpoints",
        "Цепочка Ingress → Service → поды."),
      single("db-debug", "Нет оболочки", "Как отлаживать под из образа без оболочки?",
        [["debug", "kubectl debug с временным отладочным контейнером"], ["ssh", "SSH в контейнер"], ["rebuild", "Пересобрать образ с bash в бою"], ["none", "Никак"]], "debug",
        "Подключается к работающему поду.")
    ]
  });

  L({
    slug: "upgrades-backups", title: "Обновления и резервные копии", summary: "Версии Kubernetes и устаревшие API, обновление узлов, бэкап etcd и Velero, что дальше.",
    skill: ["k8s-upgrades", "Обслуживание кластера", "Обновлять кластер и восстанавливать его из копий."],
    now: "Отлаживаем по шагам и поддерживаем кластер в порядке годами.",
    body: [
      idea("Версии", "Каждые несколько месяцев", "Kubernetes выпускает новую версию примерно трижды в год и поддерживает около года. Отставать опасно.", "Устаревшие версии не получают исправлений безопасности."),
      idea("Устаревшие API", "Проверить манифесты", "Перед обновлением ищут манифесты со старыми apiVersion — их уберут в новой версии.", "Инструменты вроде pluto находят их заранее."),
      idea("Порядок", "Сначала мозг, потом узлы", "Обновляют плоскость управления, затем узлы по одному через drain, с PDB у приложений.", "Без простоя для пользователей."),
      sh("Velero", "Резервные копии", "Velero сохраняет объекты кластера и диски в объектное хранилище и восстанавливает их в новый кластер.", "Кластер можно поднять заново после аварии.", "$ velero backup create nightly --include-namespaces shop\nBackup request \"nightly\" submitted successfully."),
      idea("Что дальше", "Куда расти", "Service mesh (Istio, Linkerd), платформенная инженерия, многокластерность, сертификации CKA и CKAD.", "Kubernetes — основа современной инфраструктуры."),
      tip("Обновляйся регулярно, проверяй устаревшие API, узлы — по одному, бэкапы — Velero и etcd.")
    ],
    quizzes: [
      single("ub-why", "Обновления", "Почему нельзя годами не обновлять Kubernetes?",
        [["support", "Старые версии перестают получать исправления безопасности"], ["speed", "Кластер замедляется"], ["license", "Кончается лицензия"], ["none", "Можно"]], "support",
        "Поддержка — около года."),
      single("ub-order", "Порядок", "В каком порядке обновляют кластер?",
        [["cp", "Сначала плоскость управления, потом узлы по одному"], ["nodes", "Сначала все узлы разом"], ["random", "В любом порядке"], ["apps", "Сначала приложения"]], "cp",
        "Узлы — через drain."),
      single("ub-velero", "Velero", "Что делает Velero?",
        [["backup", "Сохраняет объекты и диски кластера и восстанавливает их"], ["deploy", "Выкладывает приложения"], ["scale", "Масштабирует поды"], ["dns", "Управляет DNS"]], "backup",
        "Подъём кластера после аварии.")
    ]
  });
}
