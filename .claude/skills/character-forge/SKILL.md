---
name: character-forge
description: Build and evolve Dorkin Academy's 3D "code characters" — procedural three.js golems (ПК, Браузер, HTML, CSS, JavaScript, SQL and later ones) that breathe, rotate and visibly change look across five ranks as the learner's level grows. Use this skill whenever the work touches a character's visual, its rank/level appearance, the /characters or /characters/{slug} pages, a character prototype or artifact, or the owner asks to make a character "look like a game", "more alive", "3D", "change as it levels up", even if they do not say "skill" or "three.js".
---

# Character forge

Dorkin Academy turns every technology into a character. The owner wants them to feel like game characters: volumetric, alive, **visibly different at every rank**, and **different from each other in body and colour**. Two drafts were rejected for failing exactly that. The first barely changed between ranks ("почти ничего у него не меняется"). The second gave every character the same golem in the same colours ("они разными должны быть и цвета разные должны быть"). The approved roster keeps the block style and gives each character its own body plan and palette.

## What to start from

- `assets/template.html` is the approved roster page: all six characters with a character switcher (three.js r128 from cdnjs, one self-contained page). Each character is one entry in `CHARACTERS` with `pal`, `build`, `crest`, `wing`, orbit tokens and rank texts. The kit (`makeKit`), the look-by-level (`applyLook`) and the loop are shared. Add a character by adding an entry.
- `references/roster.md` has the silhouette and the props per rank for every character, plus the shared rank windows. Read it before designing a character, and add a row when a new character joins the roster.
- `scripts/shoot.mjs` screenshots the scene at levels 0, 30, 50, 70 and 100.

## The look, and why

- **Own palette per character** (table in `references/roster.md`). Every character starts grey at rank 1 and fills with its own `base` colour from rank 2. Its `glow` and `aura` light the eyes, the core, the sparks, the ring and the rims, and its `ui` colours restyle the page while it is shown. The site's ember accent belongs to HTML; the others must not drift back to ember.
- **Own body plan per character:** treads, a coat, long legs, springs, a drum. Do not reuse the same legs and arms with new colours.
- **Block bodies from boxes, cones and octahedra.** They read as "made of code", render fast on weak phones and are easy to grow piece by piece. Avoid smooth organic meshes and imported models; they break the style and the performance budget.
- **Five ranks (Каменный, Пробуждённый, Бронированный, Мастер…, Легендарный), each adding something you can see from across the room:** size and posture, then colour and light, then armour and tools, then hover and orbiting subject tokens, then wings and aura. The rank table is in `references/roster.md`. A rank that only changes brightness or colour does not count.
- **Grow, don't pop.** Armour and props scale in over a short level window with `gear(mesh, from, to)` so moving the slider shows pieces assembling. A rank-up flash and the «Новый ранг» toast mark the threshold.
- **Alive at rest:** breathing, a slow bob, head turns, arm swing, slow auto-rotation, drag to rotate (pointer events, works with a finger). Respect `prefers-reduced-motion` by zeroing the idle motion multiplier.
- **Light and framing:** a hemisphere fill plus a warm key light and ember rim lights that strengthen with rank. Tone the emissive values down at rank 5 until armour edges are still readable; an all-orange blob was the second prototype's mistake. Frame the camera so the crest and wings at level 100 stay inside the scene, and pull the camera back on narrow screens.

## Performance budget

Learners use cheap Android phones. Keep one scene per page and pixel ratio ≤ 2, about 120 meshes or fewer, and ≤ 400 particles drawn as one `Points`. Use no shadows maps (fake the ground shadow with a dark disc) and no post-processing. Textures are only small canvas textures (≤ 256 px). Animate by changing transforms and uniforms, never by rebuilding geometry per frame.

## Workflow

1. Read the character's row in `references/roster.md` and its real skill count from the manifests.
2. Copy `assets/template.html`, rename texts (`<title>`, `<h1>`, role, `STAGES`, `TOTAL_SKILLS`), then build the body and the rank props.
3. Check the five levels with `scripts/shoot.mjs` (usage at the top of the script) and **look at all five screenshots** before showing anything. Fix what you see in one pass: a rank that looks like the previous one, clipped props, an over-exposed body, page errors. Then show the owner.
4. As a prototype, publish it as an Artifact. On the site, put it into the Web app as a client component that loads three.js only on the character pages (dynamic import, no server rendering of the canvas), takes the level from the learner's real skill states, and keeps the existing text layout for screen readers and search engines.

## When moving a character onto the site

- The level comes from the server's skill states (see `apps/web/src/lib/skill-map/` and the characters stage-1 row in `docs/engineering/current-state.md`); the slider is only for the prototype.
- Keep Web files ≤ 300 lines (an architecture test enforces it). Split the shared scene code (renderer, light, ring, sparks, loop, kit, applyLook) from the per-character files (palette, build, crest, wing).
- Load three.js from the workspace dependency, not a CDN, and only on character routes, so the course pages stay light.
- Give the canvas an `aria-hidden` wrapper and keep a text description of the rank and level next to it.
