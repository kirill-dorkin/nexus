import type { Metadata } from "next";
import { brand } from "@platform/brand";
import Link from "next/link";
import { Eyebrow } from "@platform/ui";
import { LearningShell } from "../../components/learning/learning-shell";
import { blogArticles } from "../../lib/blog";
import { absoluteUrl } from "../../lib/site";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "Блог об обучении и цифровых навыках",
  description: `Практические материалы команды ${brand.name} о компьютерной грамотности, обучении и понятной работе с технологиями.`,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: `Блог ${brand.name} об обучении и цифровых навыках`,
    description:
      "Понятные материалы о компьютерной грамотности и работе с технологиями.",
    url: "/blog",
    type: "website"
  }
};

export default function BlogPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: `Блог ${brand.name}`,
    description: metadata.description,
    url: absoluteUrl("/blog"),
    publisher: { "@type": "Organization", name: brand.name }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c")
        }}
      />
      <LearningShell>
        <header className={styles.indexHero}>
          <div>
            <Eyebrow>Блог {brand.name}</Eyebrow>
            <h1>Разбираться в технологиях — спокойно и по шагам.</h1>
            <p>
              Практические статьи для тех, кто осваивает цифровые инструменты,
              учится сам или помогает учиться другим.
            </p>
          </div>
          <div className={styles.indexNote}>
            Материалы готовит команда {brand.name}. Без вымышленных историй
            успеха и обещаний быстрых результатов.
          </div>
        </header>
        <section className={styles.articles} aria-label="Статьи">
          {blogArticles.map((article) => (
            <Link
              className={styles.articleRow}
              href={`/blog/${article.slug}`}
              key={article.slug}
            >
              <div>
                <div className={styles.meta}>
                  <span>{article.category}</span>
                  <time dateTime={article.publishedAt}>9 октября 2026</time>
                  <span>{article.readingMinutes} минут</span>
                </div>
                <h2>{article.title}</h2>
                <p>{article.description}</p>
              </div>
              <span className={styles.arrow} aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </section>
      </LearningShell>
    </>
  );
}
