# Homepage redesign baseline and decision

Verified before edits on 2026-10-13: main c4e910b210d8694fa1fc771abd2d53a951735a5d; PR88 head 3fcc786283f3cfc831a537f46ce4dbf70e8e0980; open Draft, no auto-merge. Remote refs and PR metadata were queried, rather than inferred from the archive. Current Preview opened successfully in the cloud browser. The attached baseline and six reference captures were inspected.

## Summary

The working homepage still had a large left headline, decorative right HTML panel, a catalog section, approach section, Blog teaser and FAQ. The existing minimal lab removed these but presented the single course as a large boxed panel. The public purpose is choosing real learning; no registration is necessary to inspect an available program.

## Improvements

- High — The working first viewport devoted most space to an HTML example and competing catalog/Blog actions, before the actual course. Browser evidence: root accessibility tree and screenshot. Replace the explanatory hero with direct course discovery. Basis: layout.md › Visual hierarchy; designer judgment on composition.
- High — A single generic HTML demonstration narrowed the perceived scope of a platform whose actual launch course is Computer Literacy. Retain general platform introduction and present actual curriculum; no fictional courses. Basis: design-principles.md › Purpose.
- Medium — Large nested surfaces and lower explanatory sections prolonged the page. Use open course spreads and a quiet footer; Blog remains navigation. Basis: design-principles.md › Simplicity.
- Medium — Existing root appearance control sat over the hero. The first new lab's bottom dock could overlap the mobile course action. Move it to a static utility row below navigation. Basis: layout.md › Guides and safe areas and accessibility.md › Mobility.

## Craft and what works

Keep the original shared tilted N/dot/lockup, Onest, semantic theme/accent mappings, validated real catalog, route helpers and genuine session transport. Actual title/lesson count/duration provide useful evidence, not invented success metrics.

## Comparison and choice

Two production-built noindex layouts used identical public catalog data and copy at 390/1440 in both themes. Open: course copy/action before image on mobile. Editorial: wide image and syllabus before the title/action. Selected open because it makes the program accessible sooner and avoids overemphasizing the single course cover. The maintainer explicitly delegated this choice and transfer to /; archive G1–G3 no longer require pauses. Codecademy/Scrimba informed clarity, not copied styles.

## Platform notes and evidence limits

Apple HIG principles apply to Web hierarchy, typography, color, writing and accessibility; native platform conventions do not override Nexus themes, Onest or CSS touch targets. Initial cloud-browser root/lab inspection was at the browser's available viewport; archive captures supplied other baseline widths. New implementation responsive evidence is separately recorded in home-redesign-verification.md. No new 3–5-person usability study or physical-device baseline audit was conducted.

Normal authorized git clone was unavailable. Every changed file was read against the verified remote head; GitHub tree writes use fresh parent/base_tree and expected-head guards. The locally materialized build is not pushed as synthetic Git history. Protected application/backend paths are unchanged.
