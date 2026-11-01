// Refreshes spec-index.json from the HTML Living Standard indices.
// Run from the repository root: node docs/examples/html-course/update-spec-index.mjs
// The contracts test then fails until every new element and attribute is taught.
import { writeFileSync } from "node:fs";

const SOURCE = "https://html.spec.whatwg.org/multipage/indices.html";
const page = await (await fetch(SOURCE)).text();

function table(caption) {
  const start = page.indexOf(`<caption>${caption}`);
  if (start < 0) throw new Error(`Table not found: ${caption}`);
  return page.slice(start, page.indexOf("</table>", start));
}
/** Names written as <code> in the first header cell of each body row. */
function names(caption, pattern) {
  const body = table(caption).split("<tbody")[1] ?? "";
  const rows = body.split(/<tr>/).slice(1);
  const found = new Set();
  for (const row of rows) {
    const header = row.split(/<td/)[0];
    for (const match of header.matchAll(/<code[^>]*>([\s\S]*?)<\/code>/g)) {
      const name = match[1].replace(/<[^>]+>/g, "").trim();
      if (pattern.test(name)) found.add(name);
    }
  }
  return [...found].sort();
}

const index = {
  source: SOURCE,
  retrieved: new Date().toISOString().slice(0, 10),
  elements: names("List of elements", /^[a-z][a-z0-9]*$/),
  attributes: names("List of attributes", /^[a-z][a-z-]*$/)
};
writeFileSync(new URL("./spec-index.json", import.meta.url), JSON.stringify(index, null, 2) + "\n");
console.log(`elements=${index.elements.length} attributes=${index.attributes.length}`);
