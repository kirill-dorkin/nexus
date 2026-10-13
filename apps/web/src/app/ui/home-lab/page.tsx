import type { Metadata } from "next";
import { CourseDiscovery } from "../../../components/learning/home-discovery";
import { HomeLab } from "./home-lab";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Новая главная — дизайн Preview", robots: { index: false, follow: false } };

export default async function HomeLabPage({ searchParams }: { searchParams: Promise<{ layout?: string }> }) {
  const { layout } = await searchParams;
  return <HomeLab layout={layout === "editorial" ? "editorial" : "open"}><CourseDiscovery /></HomeLab>;
}

