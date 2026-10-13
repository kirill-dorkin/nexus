import type { Metadata } from "next";
import { HeroLab, HeroReview, type HeroDirection } from "./hero-lab";

export const metadata: Metadata = {
  title: "Концепции главного экрана",
  robots: { index: false, follow: false }
};

export default async function HeroLabPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { view } = await searchParams;
  const direction = typeof view === "string" &&
    ["editorial", "path", "lesson"].includes(view)
    ? view as HeroDirection : null;
  return direction ? <HeroLab direction={direction} /> : <HeroReview />;
}
