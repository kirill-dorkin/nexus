// Builds ../kubernetes-track.manifest.json from the chapter sources.
// Run from the repository root: node docs/examples/kubernetes-course/build.mjs
import { createCourse } from "../html-course/lib.mjs";
import { buildCourse } from "../pc-course/kit.mjs";

// Order is the learning path; each chapter is a section of the course page and a branch of Kubernetes.
const chapters = [
  ["Зачем Kubernetes", "k01-why.mjs"],
  ["Поды", "k02-pods.mjs"],
  ["Развёртывания", "k03-deployments.mjs"],
  ["Сервисы и сеть", "k04-services.mjs"],
  ["Настройки и секреты", "k05-config.mjs"],
  ["Хранение данных", "k06-storage.mjs"],
  ["Здоровье и ресурсы", "k07-health.mjs"],
  ["Масштабирование", "k08-scaling.mjs"],
  ["Безопасность кластера", "k09-security.mjs"],
  ["Пакеты и GitOps", "k10-gitops.mjs"],
  ["Эксплуатация", "k11-operations.mjs"]
];

await buildCourse({
  createCourse,
  base: import.meta.url,
  chapters,
  cast: ["nika"],
  out: new URL("../kubernetes-track.manifest.json", import.meta.url),
  course: {
    slug: "kubernetes",
    title: "Kubernetes: флот контейнеров",
    description:
      "Kubernetes с нуля до своего кластера. Зачем оркестратор, поды и манифесты, развёртывания и обновления, сервисы, Ingress и сеть, ConfigMap и Secret, тома и StatefulSet, проверки здоровья, запросы и лимиты ресурсов, автомасштабирование, RBAC и сетевые политики, Helm, Kustomize и GitOps, наблюдение и отладка. Каждое понятие объясняется карточкой с примером, каждый урок закрепляется вопросами."
  }
});
