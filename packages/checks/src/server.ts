import { selectAll } from "css-select";
import {
  isTag,
  isText,
  type AnyNode,
  type Document,
  type Element,
  type ParentNode
} from "domhandler";
import { Parser } from "parse5";
import {
  adapter,
  type Htmlparser2TreeAdapterMap
} from "parse5-htmlparser2-tree-adapter";
import type { CheckDocument, CheckElement } from "./evaluate";
import { itemAt } from "./item-at";

/*
 * Server-side HTML for the static checks (ADR-0072): parse5 builds the tree with the HTML
 * standard's algorithm, the same one browsers use for DOMParser, and css-select runs the
 * selectors on it. Nothing is executed: scripts, styles and event attributes stay inert text.
 */

/** Larger pages are refused before parsing (the assignment limit is 1 MB in total). */
export const MAX_SERVER_PAGE_LENGTH = 1_000_000;

/** A page the server will not check: too large, or nested deeper than any real page. */
export class UncheckablePageError extends RangeError {
  override readonly name = "UncheckablePageError";
}

/**
 * Chrome's parser stops nesting the DOM at this depth. The server refuses deeper pages instead:
 * no real page nests this deep, and parse5 scans its stack of open elements for many start
 * tags, so 20 000 nested `<div>`s would take seconds.
 */
export const MAX_TREE_DEPTH = 512;

/** parse5 with a bound on its stack of open elements; it stops at the first element too deep. */
class BoundedParser extends Parser<Htmlparser2TreeAdapterMap> {
  override onItemPush(node: ParentNode, tid: number, isTop: boolean) {
    if (this.openElements.stackTop >= MAX_TREE_DEPTH)
      throw new UncheckablePageError("The page nests too deeply to check.");
    super.onItemPush(node, tid, isTop);
  }
}

const HTML_NAMESPACE = "http://www.w3.org/1999/xhtml";

/** Text of an element's text nodes, like `Node.textContent`; iterative, so deep markup is safe. */
function textOf(element: Element): string {
  let text = "";
  const stack: AnyNode[] = [...element.children].reverse();
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (isText(node)) text += node.data;
    else if ("children" in node)
      for (let i = node.children.length - 1; i >= 0; i--)
        stack.push(itemAt(node.children, i));
  }
  return text;
}

/**
 * A `<template>`'s content is a separate fragment in a browser, which selectors and
 * `textContent` never see; the tree adapter hangs it under the element, so it is removed.
 */
function dropTemplateContent(root: Document) {
  const stack: AnyNode[] = [root];
  for (let node = stack.pop(); node; node = stack.pop()) {
    if (!("children" in node)) continue;
    if (isTag(node) && node.name === "template") node.children = [];
    else for (const child of node.children) stack.push(child);
  }
}

function wrap(element: Element): CheckElement {
  // HTML attribute names are case-insensitive; parse5 stores them lowercased.
  const key = (name: string) =>
    element.namespace === HTML_NAMESPACE ? name.toLowerCase() : name;
  return {
    get textContent() {
      return textOf(element);
    },
    hasAttribute: (name) => Object.hasOwn(element.attribs, key(name)),
    getAttribute: (name) =>
      Object.hasOwn(element.attribs, key(name))
        ? (element.attribs[key(name)] ?? null)
        : null
  };
}

/**
 * `parseHtml` for `runChecks` and `runStaticChecks` outside the browser. Throws
 * `UncheckablePageError` for a page it refuses; the caller decides what the learner sees.
 */
export function parseHtmlOnServer(source: string): CheckDocument {
  if (source.length > MAX_SERVER_PAGE_LENGTH)
    throw new UncheckablePageError("The page is too large to check.");
  // DOMParser documents have scripting disabled, so <noscript> content is parsed as markup.
  const root = BoundedParser.parse(source, {
    treeAdapter: adapter,
    scriptingEnabled: false
  });
  dropTemplateContent(root);
  return {
    querySelectorAll: (selector) =>
      selectAll<AnyNode, Element>(selector, root, { xmlMode: false }).map(wrap)
  };
}
