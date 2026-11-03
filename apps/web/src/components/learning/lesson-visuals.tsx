"use client";
import { useMemo, type ReactNode } from "react";
import {
  DomDiagram,
  FlowDiagram,
  Frame,
  TreeDiagram,
  UrlDiagram
} from "./visuals/diagrams";
import { parseVisual, type Visual } from "./visuals/model";
import { TypingDemo } from "./visuals/typing-demo";

export { caretOffset } from "./visuals/frames";
export { parseVisual, type Visual } from "./visuals/model";

export function LessonVisual({ visual }: { visual: Visual }) {
  switch (visual.kind) {
    case "url":
      return (
        <Frame title={visual.title} kind="url">
          <UrlDiagram parts={visual.parts} />
        </Frame>
      );
    case "tree":
      return (
        <Frame title={visual.title} kind="tree">
          <TreeDiagram items={visual.items} />
        </Frame>
      );
    case "flow":
      return (
        <Frame title={visual.title} kind="flow">
          <FlowDiagram steps={visual.steps} />
        </Frame>
      );
    case "dom":
      return (
        <Frame title={visual.title} kind="dom">
          <DomDiagram html={visual.html} />
        </Frame>
      );
    case "typing":
      // Every scene is its own animation; a legacy multi-scene block becomes a stack of them.
      return (
        <>
          {visual.scenes.map((scene, i) => (
            <Frame
              key={i}
              title={
                visual.scenes.length > 1
                  ? (scene.caption ?? visual.title)
                  : visual.title
              }
              kind="typing"
            >
              <TypingDemo scene={scene} file={visual.file ?? "index.html"} />
            </Frame>
          ))}
        </>
      );
  }
}

/** Markdown entry point: draws a valid visual, otherwise shows the source as code. */
export function VisualBlock({
  source,
  fallback
}: {
  source: string;
  fallback: ReactNode;
}) {
  const visual = useMemo(() => parseVisual(source), [source]);
  return visual ? <LessonVisual visual={visual} /> : <>{fallback}</>;
}
