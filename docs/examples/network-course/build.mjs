// Builds ../network-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/network-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Сеть и HTTP.
const chapters = [
  ["Как устроена сеть", "w01-layers.mjs"],
  ["IP-адреса и подсети", "w02-ip.mjs"],
  ["TCP и UDP", "w03-transport.mjs"],
  ["DNS изнутри", "w04-dns.mjs"],
  ["TLS и сертификаты", "w05-tls.mjs"],
  ["HTTP в деталях", "w06-http.mjs"],
  ["Реальное время", "w07-realtime.mjs"],
  ["Проектирование API", "w08-api.mjs"],
  ["CDN, кэш и балансировка", "w09-cdn.mjs"],
  ["Прокси, NAT и файрволы", "w10-proxy.mjs"],
  ["Диагностика сети", "w11-diagnostics.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../network-track.manifest.json", import.meta.url),
  course: {
    slug: "network",
    title: "Сеть и HTTP: как данные путешествуют",
    description:
      "Что происходит под HTTP. Модели сети и пакеты, IP-адреса, подсети и маршрутизация, TCP и UDP, порты и сокеты, DNS изнутри, TLS-рукопожатие и сертификаты, HTTP/1.1, HTTP/2 и HTTP/3, WebSocket и Server-Sent Events, проектирование API, CDN, кэш и балансировщики, прокси, NAT и файрволы и диагностика сети от ping до Wireshark. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
