// Chapter 9: boot and services — from power-on to login, init systems, services and logs, scheduled tasks.
import { idea, sh, tip, makeLesson } from "./okit.mjs";

export default function boot(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "boot", title: "Загрузка компьютера", summary: "UEFI, загрузчик, ядро и initramfs, первый процесс, Secure Boot.",
    skill: ["os-boot", "Загрузка", "Описывать путь от включения до входа в систему."],
    now: "Знаем механизмы защиты и смотрим, как система запускается с нуля.",
    body: [
      idea("UEFI", "Прошивка платы", "После включения прошивка проверяет железо и ищет загрузчик на диске (раздел EFI).", "Отсюда выбирают, с какого диска или флешки грузиться."),
      idea("Загрузчик", "GRUB, systemd-boot, Boot Manager", "Загружает в память ядро и начальный образ (initramfs) и передаёт управление ядру.", "Можно выбрать ядро или систему при двойной загрузке."),
      idea("Ядро и initramfs", "Первые шаги", "Ядро инициализирует память и устройства; initramfs содержит драйверы, чтобы найти и подключить настоящий корневой диск.", "Например, зашифрованный или RAID-диск."),
      idea("PID 1", "Первый процесс", "Ядро запускает init (в Linux — systemd), а тот — все остальные службы и экран входа.", "Все процессы — потомки процесса 1."),
      idea("Secure Boot", "Только подписанное", "Прошивка запускает только подписанные загрузчики и ядра.", "Вредонос не встроится в загрузку незаметно."),
      tip("UEFI → загрузчик → ядро и initramfs → PID 1 → службы → вход.")
    ],
    quizzes: [
      single("bt-pid1", "Первый процесс", "Какой процесс в современном Linux обычно имеет PID 1?",
        [["systemd", "systemd"], ["bash", "bash"], ["kernel", "Само ядро"], ["login", "login"]], "systemd",
        "Он запускает всё остальное."),
      single("bt-initramfs", "initramfs", "Зачем нужен initramfs?",
        [["drivers", "Дать ядру драйверы, чтобы подключить корневой диск"], ["gui", "Показать интерфейс"], ["backup", "Резервная копия"], ["net", "Подключить Wi-Fi"]], "drivers",
        "Особенно для шифрования и RAID."),
      single("bt-secure", "Secure Boot", "От чего защищает Secure Boot?",
        [["unsigned", "От запуска неподписанных загрузчиков и ядер"], ["virus", "От всех вирусов"], ["theft", "От кражи ноутбука"], ["spam", "От спама"]], "unsigned",
        "Защищает цепочку загрузки.")
    ]
  });

  L({
    slug: "services", title: "Службы", summary: "systemd и его юниты, systemctl, автозапуск и перезапуск, launchd и службы Windows.",
    skill: ["os-services", "Службы", "Управлять фоновыми службами."],
    now: "Знаем, как система загружается, и управляем фоновыми службами.",
    body: [
      sh("systemctl", "Управление службами", "`systemctl status nginx`, `start`, `stop`, `restart`, `enable` (автозапуск при загрузке).", "Стандартный способ управлять сервером на Linux.", "$ systemctl status nginx\n● nginx.service - A high performance web server\n     Active: active (running) since Sat 2026-11-07 06:10:22"),
      idea("Юнит", "Описание службы", "Файл .service: что запускать, от какого пользователя, когда перезапускать, после каких служб.", "Своё приложение становится службой за десяток строк.", "[Service]\nExecStart=/opt/app/server\nUser=app\nRestart=on-failure\n\n[Install]\nWantedBy=multi-user.target"),
      idea("Перезапуск", "Restart=on-failure", "systemd сам поднимет службу после падения и не даст ей перезапускаться бесконечно часто.", "Сервис переживает случайный сбой."),
      idea("Другие системы", "launchd и Windows", "В macOS — launchd и файлы plist, в Windows — службы (services.msc, sc).", "Идея та же: фоновые программы под управлением системы."),
      tip("Служба — юнит systemd: ExecStart, User, Restart. enable — автозапуск.")
    ],
    quizzes: [
      single("sv-enable", "Автозапуск", "Какая команда включит автозапуск службы при загрузке?",
        [["enable", "`systemctl enable имя`"], ["start", "`systemctl start имя`"], ["boot", "`systemctl boot имя`"], ["auto", "`systemctl auto имя`"]], "enable",
        "start запускает только сейчас."),
      single("sv-restart", "Перезапуск", "Что делает Restart=on-failure в юните?",
        [["restart", "Перезапускает службу после аварийного завершения"], ["reboot", "Перезагружает сервер"], ["never", "Запрещает перезапуск"], ["log", "Пишет в журнал"]], "restart",
        "С ограничением частоты."),
      single("sv-mac", "macOS", "Что управляет службами в macOS?",
        [["launchd", "launchd"], ["systemd", "systemd"], ["cron", "Только cron"], ["init", "SysV init"]], "launchd",
        "Файлы plist.")
    ]
  });

  L({
    slug: "logs-cron", title: "Журналы и расписание", summary: "journalctl, системный журнал и dmesg, cron и таймеры systemd, ротация логов.",
    skill: ["os-logs", "Журналы и расписание", "Читать системные журналы и запускать задачи по расписанию."],
    now: "Управляем службами и учимся читать их журналы и запускать задачи по расписанию.",
    body: [
      sh("journalctl", "Журнал systemd", "`journalctl -u nginx --since \"1 hour ago\"` — журнал службы, `-f` — следить в реальном времени.", "Почему служба упала — ответ обычно здесь.", "$ journalctl -u app -n 5\nNov 07 06:12:03 srv app[811]: listening on :8080\nNov 07 06:40:51 srv systemd[1]: app.service: Main process exited, code=killed, status=9/KILL"),
      sh("dmesg", "Журнал ядра", "Сообщения ядра: устройства, ошибки дисков, OOM killer. `dmesg -T` — с человеческим временем.", "Аппаратные проблемы видны только здесь."),
      sh("cron", "По расписанию", "`crontab -e`, строка `0 3 * * * /opt/backup.sh` — каждый день в 3:00. Пять полей: минута, час, день, месяц, день недели.", "Ночные резервные копии и отчёты.", "# мин час день мес день_недели  команда\n0 3 * * * /opt/backup.sh"),
      idea("Таймеры systemd", "Современная замена", "Таймер .timer запускает службу по расписанию, с журналом и зависимостями.", "Видно, когда задача запускалась и чем закончилась."),
      idea("Ротация", "Логи не бесконечны", "logrotate и journald архивируют и удаляют старые записи.", "Иначе журналы съедают диск."),
      tip("Служба — journalctl -u, ядро — dmesg. Расписание — cron или таймер systemd.")
    ],
    quizzes: [
      single("lc-cron", "cron", "Когда выполнится `30 2 * * 1 /opt/report.sh`?",
        [["mon", "Каждый понедельник в 2:30"], ["daily", "Каждый день в 2:30"], ["first", "Первого числа месяца"], ["30", "Каждые 30 минут"]], "mon",
        "Последнее поле — день недели, 1 — понедельник."),
      single("lc-unit", "Журнал службы", "Как посмотреть журнал только службы app?",
        [["u", "`journalctl -u app`"], ["dmesg", "`dmesg app`"], ["cat", "`cat app`"], ["ps", "`ps app`"]], "u",
        "-f — следить."),
      single("lc-dmesg", "Ядро", "Где искать сообщение OOM killer и ошибки диска?",
        [["dmesg", "В журнале ядра (dmesg)"], ["browser", "В браузере"], ["cron", "В crontab"], ["home", "В домашней папке"]], "dmesg",
        "Или journalctl -k.")
    ]
  });
}
