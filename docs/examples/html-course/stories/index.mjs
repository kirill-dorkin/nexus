// Story bodies by lesson slug. A lesson listed here uses its story body instead of the original prose.
// The element reference keeps its original body: it is the full map of every element.
import start from "./s00-start.mjs";
import text from "./s01-text.mjs";
import linksMedia from "./s02-links-media.mjs";
import tablesForms from "./s03-tables-forms.mjs";
import structureHead from "./s04-structure-head.mjs";
import a11yFinal from "./s05-a11y-final.mjs";

export default { ...start, ...text, ...linksMedia, ...tablesForms, ...structureHead, ...a11yFinal };
