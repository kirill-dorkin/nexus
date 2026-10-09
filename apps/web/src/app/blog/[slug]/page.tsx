import type { Metadata } from "next";
import { brand } from "@platform/brand";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LearningShell } from "../../../components/learning/learning-shell";
import { blogArticles, findBlogArticle } from "../../../lib/blog";
import { absoluteUrl, jsonLd } from "../../../lib/site";
import styles from "../blog.module.css";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blogArticles.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const article = findBlogArticle((await params).slug);
  if (!article) return {};
  const path = `/blog/${article.slug}`;
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: path },
    authors: [{ name: `Команда ${brand.name}` }],
    openGraph: {
      type: "article",
      url: path,
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      authors: [`Команда ${brand.name}`]
    }
  };
}

export default async function ArticlePage({ params }: Props) {
  const article = findBlogArticle((await params).slug);
  if (!article) notFound();
  const path = `/blog/${article.slug}`;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ru",
    mainEntityOfPage: absoluteUrl(path),
    author: { "@type": "Organization", name: `Команда ${brand.name}` },
    publisher: { "@type": "Organization", name: brand.name }
  };

  return (
    <LearningShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structuredData) }}
      />
      <nav className={styles.breadcrumbs} aria-label="Навигационная цепочка">
        <Link href="/">Главная</Link><span aria-hidden="true">/</span>
        <Link href="/blog">Блог</Link>
      </nav>
      <header className={styles.articleHeader}>
        <div className={styles.meta}>
          <span>{article.category}</span>
          <time dateTime={article.publishedAt}>9 октября 2026</time>
          <span>{article.readingMinutes} минут чтения</span>
        </div>
        <h1>{article.title}</h1>
        <p>{article.description}</p>
      </header>
      <div className={styles.articleLayout}>
        <article className={styles.articleBody}>
          <p>{article.lead}</p>
          {article.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              {section.points ? <ul>{section.points.map((point) => <li key={point}>{point}</li>)}</ul> : null}
            </section>
          ))}
        </article>
        <aside className={styles.articleAside} aria-label="Связанный курс">
          <strong>Закрепите материал на практике</strong>
          <p>Открытый курс ведёт от устройства компьютера до безопасной работы с файлами и документами.</p>
          <Link href="/courses">Перейти к курсам →</Link>
        </aside>
      </div>
    </LearningShell>
  );
}
