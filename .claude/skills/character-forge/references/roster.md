# Character roster: look and rank props

Each technology is a character, the "keeper" of its district in the skill map. Every character shares the block body language of the template: a stone golem built from stacked boxes, which grows, straightens and catches fire as the learner confirms skills. What changes is the **silhouette, the signature props and what each rank adds**. Pick props from the technology's own world, so a learner who knows the subject recognises them.

Skill counts come from the course manifests (`docs/examples/*-track.manifest.json`) and `docs/examples/skill-map/characters.mjs`. Check them before hard-coding `TOTAL_SKILLS`.

| Character | Role (Russian UI) | Silhouette | Signature props by rank |
|---|---|---|---|
| ПК | Знаток компьютера | Wide and squat: a tower case for a torso, a monitor for a head (screen face), cable "dreadlocks" | 2: the screen face lights up, power LED. 3: case panels and heat-sink armour, a keyboard shield. 4: orbiting parts (CPU chip, RAM stick, disk, fan) and a spinning fan halo. 5: ventilation fire from the back vents, glowing circuit traces over the body. |
| Браузер | Проводник по вебу | Tall and slim traveller: a round head like a globe, a coat whose hem is a tab bar | 2: an address-bar visor lights up. 3: a compass shield, tab-strip pauldrons, a satchel of cookies. 4: orbiting tabs and status codes (200, 301, 404) and a DNS lantern on a staff. 5: wings made of open tabs, the globe head burns with meridians. |
| HTML | Строитель страниц | The template character: a blocky builder | 2: molten cracks, both eyes and the core. 3: spiked pauldrons, chest plate, gauntlets, greaves, crested helmet. 4: hover, orbiting `<div>` `<p>` `<a>` `<img>` slabs, a `</>` crest. 5: wings of angle brackets, head fire, molten body. |
| CSS | Художник интерфейсов | Lean and graceful, a painter: a long brush-staff, a palette shield; proportions set by a visible box-model frame (margin/border/padding rings) | 2: paint-coloured eyes and a gradient core. 3: armour plates in a 3-colour scheme, a flexbox belt. 4: hover, orbiting swatches and a rotating grid lattice, a `{ }` crest. 5: a cape that shifts hue, a rainbow-ember aura, the brush trails light. |
| JavaScript | Механик страниц | Agile, asymmetric: one mechanical gear-arm, a lightning-bolt antenna, the yellow of JS as a trim colour next to ember | 2: lightning flickers in the cracks, the core is a spinning gear. 3: piston armour, a gear shield, `=>` arrows on the shoulders. 4: hover, orbiting `{}` `()` `=>` `await` tokens, sparks jumping between them. 5: wings of event loop rings, constant lightning, the body ticks like clockwork. |
| SQL | Хранитель данных | Heavy and steady: a barrel/cylinder torso (a database drum), a table-grid chest | 2: the drum's rings glow, rows light up one by one. 3: stacked-drum armour, a key (primary key) as a weapon, an index-card shield. 4: hover, orbiting table slabs linked by glowing join lines, a `SELECT` crest. 5: a crown of drums, a column of light from the core, the joins burn. |

Rank windows are shared by all characters (levels 0–100):

| Rank | Levels | Name pattern | What must be visibly new |
|---|---|---|---|
| 1 | 0–19 | Каменный | Small (scale ~0.8), hunched, grey, dark cracks, one dead eye. Nothing glows except a faint eye. |
| 2 | 20–39 | Тлеющий | Stands up, both eyes and the core glow, cracks turn molten, the ground ring wakes. |
| 3 | 40–59 | Бронированный | Clearly taller; at least four armour pieces appear one after another (pauldrons, chest, gauntlets, legs, helmet). |
| 4 | 60–79 | Мастер (of the subject) | Hovers; orbiting subject tokens; a crest above the head; glowing seams. |
| 5 | 80–100 | Пламенный | Wings or a cape from the subject's shapes, head fire, a molten body, a sparks aura, the ring pulses. |

Russian rank names may be adapted to the character (for example «Мастер тегов» for HTML, «Мастер стилей» for CSS), but the five steps stay the same so the roster reads as one system.
