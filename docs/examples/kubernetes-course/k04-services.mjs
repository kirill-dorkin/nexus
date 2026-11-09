// Chapter 4: services and networking — Service types, DNS, Ingress and Gateway, network model.
import { idea, sh, yml, tip, makeLesson } from "./kkit.mjs";

export default function services(c, rc) {
  const L = makeLesson(c, rc);
  const { single } = c;

  L({
    slug: "service", title: "Service", summary: "Стабильный адрес для набора подов, ClusterIP, балансировка, DNS-имена сервисов.",
    skill: ["k8s-service", "Service", "Давать подам стабильный адрес через Service."],
    now: "Знаем виды нагрузок и даём подам постоянный адрес.",
    body: [
      yml("Service", "Постоянный адрес", "Сервис выбирает поды по меткам и распределяет между ними трафик. Его адрес и имя не меняются, даже когда поды пересоздаются.", "Фронтенд всегда обращается к api, а не к конкретному поду.", "apiVersion: v1\nkind: Service\nmetadata:\n  name: api\nspec:\n  selector: { app: api }\n  ports:\n    - port: 80\n      targetPort: 8000"),
      idea("DNS", "Имя вместо IP", "Внутри кластера сервис доступен по имени api, из другого пространства — api.billing.svc.cluster.local.", "Как имена контейнеров в Compose."),
      idea("ClusterIP", "Только внутри", "Тип по умолчанию: адрес доступен только внутри кластера.", "База и внутренние API не видны снаружи."),
      sh("port-forward", "Заглянуть снаружи", "`kubectl port-forward svc/api 8080:80` пробрасывает сервис на твой компьютер для отладки.", "Проверить внутренний сервис без публикации.", "$ kubectl port-forward svc/api 8080:80\nForwarding from 127.0.0.1:8080 -> 8000"),
      tip("Постоянный адрес для подов — Service по меткам. Внутри кластера — по имени.")
    ],
    quizzes: [
      single("sv-why", "Зачем", "Зачем нужен Service, если у подов есть IP?",
        [["stable", "Поды пересоздаются с новыми IP, а у сервиса адрес постоянный"], ["speed", "Для скорости"], ["tls", "Для HTTPS"], ["none", "Незачем"]], "stable",
        "И балансировка между подами."),
      single("sv-dns", "Имя", "Как под фронтенда обращается к сервису api в том же пространстве имён?",
        [["name", "По имени api"], ["ip", "Только по IP пода"], ["localhost", "Через localhost"], ["public", "Через публичный адрес"]], "name",
        "Встроенный DNS."),
      single("sv-pf", "Отладка", "Как проверить внутренний сервис со своего компьютера?",
        [["pf", "`kubectl port-forward svc/api 8080:80`"], ["expose", "Сделать его публичным навсегда"], ["ssh", "Зайти на узел"], ["none", "Никак"]], "pf",
        "Только для отладки.")
    ]
  });

  L({
    slug: "ingress", title: "Вход снаружи", summary: "NodePort и LoadBalancer, Ingress и Gateway API, маршрутизация по доменам и путям, HTTPS и cert-manager.",
    skill: ["k8s-ingress", "Ingress", "Открывать приложения наружу через Ingress или Gateway."],
    now: "Даём сервисам имена внутри и открываем приложение наружу.",
    body: [
      idea("NodePort и LoadBalancer", "Простые способы", "NodePort открывает порт на каждом узле, LoadBalancer просит облако создать балансировщик с внешним IP.", "Один балансировщик на каждый сервис — дорого."),
      yml("Ingress", "Один вход на всех", "Один контроллер (nginx, Traefik) принимает внешний трафик и направляет по домену и пути к нужным сервисам.", "Десяток сервисов за одним IP.", "apiVersion: networking.k8s.io/v1\nkind: Ingress\nmetadata:\n  name: web\nspec:\n  rules:\n    - host: app.example.com\n      http:\n        paths:\n          - path: /api\n            pathType: Prefix\n            backend: { service: { name: api, port: { number: 80 } } }"),
      idea("Gateway API", "Новое поколение", "Более выразительная замена Ingress: разделение ролей, веса трафика для канарейки, не только HTTP.", "Новые проекты всё чаще выбирают Gateway API."),
      idea("cert-manager", "HTTPS автоматически", "Получает и продлевает сертификаты Let's Encrypt для доменов из Ingress.", "Забытый сертификат больше не роняет сайт."),
      tip("Наружу — Ingress или Gateway с одним входом. Сертификаты — cert-manager.")
    ],
    quizzes: [
      single("in-why", "Ingress", "Чем Ingress лучше отдельного LoadBalancer для каждого сервиса?",
        [["one", "Один внешний вход и маршрутизация по доменам и путям"], ["speed", "Он всегда быстрее"], ["db", "Он хранит данные"], ["none", "Ничем"]], "one",
        "Дешевле и удобнее."),
      single("in-cert", "Сертификаты", "Что делает cert-manager?",
        [["tls", "Получает и продлевает TLS-сертификаты автоматически"], ["users", "Управляет пользователями"], ["images", "Собирает образы"], ["dns", "Покупает домены"]], "tls",
        "Обычно у Let's Encrypt."),
      single("in-gw", "Gateway API", "Что такое Gateway API?",
        [["next", "Более выразительная замена Ingress для маршрутизации трафика"], ["db", "API базы данных"], ["auth", "Система входа"], ["cdn", "Облачный CDN"]], "next",
        "Веса для канарейки, разделение ролей.")
    ]
  });

  L({
    slug: "network-model", title: "Сетевая модель", summary: "Каждому поду свой IP, сетевые плагины CNI, kube-proxy, отладка сети изнутри кластера.",
    skill: ["k8s-network", "Сеть кластера", "Понимать сетевую модель Kubernetes и отлаживать её."],
    now: "Открыли приложение наружу и разбираемся, как устроена сеть внутри.",
    body: [
      idea("Плоская сеть", "IP у каждого пода", "Любой под может обратиться к любому другому поду по IP без NAT — это правило модели.", "Приложения работают как на обычной сети."),
      idea("CNI", "Сетевой плагин", "Сеть реализует плагин: Calico, Cilium, Flannel. От него зависят сетевые политики и производительность.", "В управляемых кластерах он уже выбран."),
      idea("kube-proxy", "Как работает Service", "Настраивает правила (iptables, IPVS или eBPF), которые перенаправляют адрес сервиса на поды.", "Магии нет — только правила ядра."),
      sh("Отладка", "Под с инструментами", "`kubectl run -it --rm debug --image=nicolaka/netshoot -- bash` — временный под с curl, dig и tcpdump.", "Проверить DNS и доступность изнутри кластера.", "$ kubectl run -it --rm debug --image=nicolaka/netshoot -- bash\ndebug:~# dig +short api.default.svc.cluster.local\n10.96.143.7\ndebug:~# curl -s api/health\n{\"status\":\"ok\"}"),
      tip("У каждого пода свой IP, сеть делает CNI, сервисы — kube-proxy. Отладка — временным подом.")
    ],
    quizzes: [
      single("nm-flat", "Модель", "Какое правило лежит в основе сети Kubernetes?",
        [["flat", "Каждый под имеет свой IP и доступен другим подам без NAT"], ["nat", "Все поды за одним NAT"], ["none", "Поды не видят друг друга никогда"], ["vpn", "Каждый под в своём VPN"]], "flat",
        "Плоская сеть."),
      single("nm-cni", "CNI", "Что такое Cilium и Calico?",
        [["cni", "Сетевые плагины CNI"], ["db", "Базы данных"], ["ci", "Системы CI"], ["editors", "Редакторы манифестов"]], "cni",
        "От них зависят политики."),
      single("nm-debug", "Отладка", "Как проверить DNS изнутри кластера?",
        [["pod", "Запустить временный под с инструментами и выполнить dig"], ["laptop", "dig на своём ноутбуке"], ["restart", "Перезапустить кластер"], ["none", "Никак"]], "pod",
        "netshoot — набор инструментов.")
    ]
  });
}
