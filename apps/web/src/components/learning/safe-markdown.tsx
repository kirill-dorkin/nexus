import Markdown from "react-markdown";
import styles from "./learning.module.css";

/** No raw HTML, images, plugins or author-selected iframe attributes. */
export function safeMarkdownUrl(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (
      !["https:", "http:", "mailto:"].includes(url.protocol) ||
      url.username ||
      url.password
    )
      return undefined;
    return url.href;
  } catch {
    return undefined;
  }
}
export function SafeMarkdown({ children }: { children: string }) {
  return (
    <div className={styles.markdown}>
      <Markdown
        skipHtml
        urlTransform={safeMarkdownUrl}
        disallowedElements={["img"]}
        components={{
          h1: ({ children }) => <h2>{children}</h2>,
          a: ({ children, href }) =>
            href ? (
              <a href={href} rel="noreferrer noopener">
                {children}
              </a>
            ) : (
              <span>{children}</span>
            )
        }}
      >
        {children}
      </Markdown>
    </div>
  );
}
