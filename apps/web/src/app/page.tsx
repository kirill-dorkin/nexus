import type { Metadata } from "next";
import { brand } from "@platform/brand";
import {
  HomeDiscoveryShell,
  CourseDiscovery,
} from "../components/learning/home-discovery";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Понятное обучение цифровым навыкам",
  description: `Открытые IT-курсы ${brand.name}: видео, понятные конспекты и практика в удобном темпе.`,
  alternates: { canonical: "/" },
  openGraph: { url: "/" },
};

export default function HomePage() {
  return (
    <HomeDiscoveryShell>
      <CourseDiscovery />
    </HomeDiscoveryShell>
  );
}
