import type { Metadata } from "next";
import { HomeReview } from "../home-review";

export const metadata: Metadata = { title: "Проверка новой главной", robots: { index:false, follow:false } };
export default function ReviewPage() { return <HomeReview />; }
