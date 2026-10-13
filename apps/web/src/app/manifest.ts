import type { MetadataRoute } from "next";
import { brand } from "@platform/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brand.name} — обучение цифровым навыкам`,
    short_name: brand.shortName,
    description: "Открытые IT-курсы с видео, конспектами и практикой.",
    start_url: "/",
    display: "standalone",
    background_color: "#130d18",
    theme_color: "#7c2458",
    lang: "ru"
  };
}
