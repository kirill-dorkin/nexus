// Chapter 3: deployments — ReplicaSets and Deployments, rolling updates and rollbacks, Jobs and DaemonSets.
import { idea, sh, yml, tip, makeLesson } from "./kkit.mjs";

export default function deployments(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "deployment", title: "Развёртывание", summary: "Deployment и ReplicaSet, число реплик, шаблон пода, самовосстановление.",
    skill: ["k8s-deploy", "Deployment", "Запускать приложения через Deployment."],
    now: "Связываем объекты метками и запускаем приложение правильно — развёртыванием.",
    body: [
      yml("Deployment", "N одинаковых подов", "Описывает шаблон пода и число реплик. Через ReplicaSet поддерживает нужное количество.", "Основной способ запускать приложения без состояния.", "apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: api\nspec:\n  replicas: 3\n  selector:\n    matchLabels: { app: api }\n  template:\n    metadata:\n      labels: { app: api }\n    spec:\n      containers:\n        - name: api\n          image: ghcr.io/team/api:1.4.0"),
      idea("Самовосстановление", "Всегда N", "Удалили под, упал узел — контроллер создаёт замену, чтобы реплик снова было три.", "Приложение переживает сбои без человека."),
      sh("scale", "Изменить число копий", "`kubectl scale deployment api --replicas=5`, но лучше поменять replicas в манифесте и применить.", "Манифест в Git — источник правды."),
      idea("ReplicaSet", "Внутренний механизм", "Deployment создаёт ReplicaSet для каждой версии шаблона. Напрямую с ними обычно не работают.", "Через них устроены обновления и откаты."),
      tip("Приложение без состояния — Deployment с replicas. Число копий — в манифесте.")
    ],
    quizzes: [
      single("dp-heal", "Самовосстановление", "Что сделает Deployment с replicas: 3, если удалить один под?",
        [["new", "Создаст новый под, чтобы снова было три"], ["two", "Оставит два"], ["all", "Удалит все"], ["alert", "Только отправит уведомление"]], "new",
        "Контроллер держит желаемое число."),
      single("dp-selector", "Селектор", "Как Deployment находит свои поды?",
        [["labels", "По меткам из selector, совпадающим с метками шаблона"], ["names", "По именам"], ["ip", "По IP"], ["random", "Случайно"]], "labels",
        "matchLabels."),
      single("dp-scale", "Масштаб", "Как правильнее изменить число реплик в проекте с GitOps?",
        [["manifest", "Изменить replicas в манифесте и применить"], ["kubectl", "Только kubectl scale вручную"], ["ssh", "Зайти на узел"], ["delete", "Удалить лишние поды"]], "manifest",
        "Источник правды — Git.")
    ]
  });

  L({
    slug: "rollouts", title: "Обновления и откаты", summary: "Постепенное обновление, maxSurge и maxUnavailable, rollout status, history и undo.",
    skill: ["k8s-rollout", "Обновления", "Обновлять приложения без простоя и откатывать их."],
    now: "Запускаем развёртывания и обновляем их без простоя.",
    body: [
      idea("RollingUpdate", "По одному", "Новая версия образа — новые поды поднимаются, старые убираются постепенно. maxSurge — сколько лишних можно поднять, maxUnavailable — сколько можно потерять.", "Пользователи не замечают обновления."),
      sh("rollout status", "Следить за выкладкой", "`kubectl rollout status deployment/api` ждёт окончания и сообщает об успехе или зависании.", "Конвейер узнаёт, что выкладка прошла.", "$ kubectl set image deployment/api api=ghcr.io/team/api:1.5.0\n$ kubectl rollout status deployment/api\nWaiting for deployment \"api\" rollout to finish: 2 of 3 updated replicas are available...\ndeployment \"api\" successfully rolled out"),
      sh("rollout undo", "Откат", "`kubectl rollout undo deployment/api` возвращает предыдущую версию, `history` показывает список.", "Откат за секунды."),
      idea("Готовность", "Без проверки — вслепую", "Обновление идёт безопасно, только если у подов есть readinessProbe: иначе трафик пойдёт на ещё не готовые поды.", "О проверках — отдельная глава."),
      tip("Обновление — новым образом и rollout status. Неудача — rollout undo.")
    ],
    quizzes: [
      single("ro-surge", "maxSurge", "Что задаёт maxSurge?",
        [["extra", "Сколько подов сверх нужного можно поднять во время обновления"], ["down", "Сколько можно потерять"], ["cpu", "Лимит процессора"], ["time", "Время обновления"]], "extra",
        "maxUnavailable — сколько можно потерять."),
      single("ro-undo", "Откат", "Как откатить развёртывание к предыдущей версии?",
        [["undo", "`kubectl rollout undo deployment/api`"], ["delete", "`kubectl delete deployment api`"], ["restart", "`kubectl restart api`"], ["git", "Только git revert"]], "undo",
        "history — список версий."),
      single("ro-ready", "Готовность", "Почему без readinessProbe обновление рискованно?",
        [["traffic", "Трафик может пойти на ещё не готовые поды"], ["slow", "Оно медленнее"], ["cost", "Оно дороже"], ["none", "Не рискованно"]], "traffic",
        "Проверка готовности обязательна.")
    ]
  });

  L({
    slug: "workloads", title: "Другие рабочие нагрузки", summary: "Job и CronJob для задач, DaemonSet на каждом узле, StatefulSet для баз.",
    skill: ["k8s-workloads", "Виды нагрузок", "Выбирать вид объекта под задачу."],
    now: "Обновляем развёртывания и знакомимся с другими видами нагрузок.",
    body: [
      yml("Job и CronJob", "Задача до конца", "Job выполняет под до успешного завершения (миграция, отчёт), CronJob — по расписанию.", "Ночной отчёт работает в кластере, а не на чьём-то ноутбуке.", "apiVersion: batch/v1\nkind: CronJob\nmetadata:\n  name: nightly-report\nspec:\n  schedule: \"0 3 * * *\"\n  jobTemplate:\n    spec:\n      template:\n        spec:\n          restartPolicy: OnFailure\n          containers:\n            - name: report\n              image: ghcr.io/team/report:1.0"),
      idea("DaemonSet", "По одному на узел", "Запускает под на каждом узле: сбор логов, агенты мониторинга, сетевые плагины.", "Новый узел сразу получает агент."),
      idea("StatefulSet", "Для состояния", "Стабильные имена (db-0, db-1), свой диск у каждой реплики и порядок запуска — для баз и очередей.", "Подробнее — в главе о хранении."),
      idea("Как выбрать", "По характеру", "Без состояния и постоянно — Deployment, до конца — Job, по расписанию — CronJob, на каждом узле — DaemonSet, с состоянием — StatefulSet.", "Правильный вид объекта решает половину проблем."),
      tip("Сервис — Deployment, разовое — Job, по расписанию — CronJob, агент — DaemonSet, база — StatefulSet.")
    ],
    quizzes: [
      single("wl-cron", "Расписание", "Какой объект запускает задачу каждую ночь?",
        [["cronjob", "CronJob"], ["deployment", "Deployment"], ["daemonset", "DaemonSet"], ["service", "Service"]], "cronjob",
        "Job — один раз."),
      single("wl-daemon", "На каждом узле", "Где запускает поды DaemonSet?",
        [["each", "По одному на каждом узле"], ["one", "Только на одном узле"], ["random", "На случайных узлах"], ["master", "Только на плоскости управления"]], "each",
        "Агенты логов и мониторинга."),
      single("wl-state", "База данных", "Какой объект подходит для базы данных в кластере?",
        [["sts", "StatefulSet"], ["deploy", "Deployment"], ["job", "Job"], ["cm", "ConfigMap"]], "sts",
        "Стабильные имена и свои диски.")
    ]
  });
}
