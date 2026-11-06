# Character roster: body, palette and rank props

The owner approved this roster on 2026-11-06 after rejecting a version where every character shared one golem body and the ember palette: "они разными должны быть и цвета разные должны быть". So **every character has its own body plan and its own palette**. The only things they share are the block style, the scene, and the five rank steps. All six are built in `assets/template.html`; copy their `build`, `crest` and `wing` functions as the reference.

Skill counts come from the course manifests (`docs/examples/*-track.manifest.json`) and `docs/examples/skill-map/characters.mjs`. Check them before hard-coding `skills`.

## Palettes

`base` is the stone colour a character grows into from grey; `glow` lights the eyes, the core, the ring and the rim light; `aura` colours the sparks and seams; `ui` sets the page accent (`--ember`, `--ember-hi`, `--flame`, `--maroon`) and the scene background while the character is shown.

| Character | base | plate | trim | glow | aura | Idea |
|---|---|---|---|---|---|---|
| ПК | `#3f5f86` | `#1b2633` | `#a9bccf` | `#38e1ff` | `#8ff3ff` | steel and cyan neon |
| Браузер | `#1f4fa0` | `#111f36` | `#d9a441` | `#5aa9ff` | `#a8d4ff` | navy with brass, sky light |
| HTML | `#9a3a1c` | `#2a1a14` | `#e34f26` | `#ff6a21` | `#ffa15c` | brick fire, the HTML5 orange |
| CSS | `#4a2fb0` | `#1a1640` | `#2dd4bf` | `#b388ff` | `#e0ccff` | indigo and violet with teal frames |
| JavaScript | `#3a3518` | `#0f0f0f` | `#f7df1e` | `#f7df1e` | `#fff59d` | black and JS yellow |
| SQL | `#13756b` | `#0d2b28` | `#c59a5b` | `#2dd4bf` | `#99f6e4` | teal and bronze |

Keep bases deep and saturated. With the hemisphere light at 0.45 and a small emissive at rank 5, they stay coloured; brightening the base turned the second draft into pastel.

## Body plans and rank props

| Character | Body plan | Rank props (3 armour → 4 master → 5 legendary) |
|---|---|---|
| ПК | Tank treads with turning wheels instead of legs, a wide tower torso with drive bays and vents, a monitor head on a neck with a pixel face, claw arms | 3: trim side panels, tread guards, heat-sink fins, a keyboard shield. 4: cable "hair", orbiting CPU/RAM/SSD/GPU/USB/OS, a spinning fan halo. 5: wings of ribbon cables. |
| Браузер | No legs: a long coat (a cone to the ground) with tab hems; always hovers a little; a slim torso; a big globe head with glowing meridians, turning; an address-bar visor | 3: brass tab pauldrons, a compass shield with a swinging needle, a staff with a glowing tip. 4: orbiting 200/301/404/DNS/HTTPS/URL, a DNS lantern crest. 5: wings of open tabs. |
| HTML | The block builder: stacked torso blocks, a helmeted head, spiked pauldrons | 3: pauldrons with spikes, chest plate, belt, gauntlets, greaves, helmet with crest and horns. 4: seams, orbiting tags, a `</>` crest. 5: bracket wings. |
| CSS | Tall and slender on long thin legs; the torso is a small core inside nested box-model frames (margin, border, padding) that sway; an octahedron crystal head; a brush staff and a palette | 3: leg armour, a teal frame, a flexbox belt, a palette with colour dots, the brush tip lights up. 4: orbiting flex/grid/rem/hover/::after/z-index, a `{ }` crest. 5: a cape of colour bands. |
| JavaScript | Spring legs (thigh, a compressing coil, shin); asymmetric arms, a thin left arm and a heavy right gear arm; a big gear on the back; a lightning-bolt antenna | 3: yellow and black stripes, pistons, gear-arm armour. 4: orbiting => { } ( ) await [ ] fn, a => crest. 5: wings of event-loop rings. |
| SQL | Squat and wide: a big drum torso with glowing rings and data rows, short stubby legs, thick arms, a small drum head | 3: bronze hoops, a PRIMARY KEY weapon, an index-card shield. 4: orbiting SELECT/JOIN/WHERE/INDEX/KEY/GROUP, a crown of drums. 5: a light column from the core, linked-table wings. |

## Shared rank steps (levels 0–100)

| Rank | Levels | Name | What must be visibly new |
|---|---|---|---|
| 1 | 0–19 | Каменный | Grey, small (scale ~0.8), hunched, dark cracks, one dead eye. |
| 2 | 20–39 | Пробуждённый | Fills with its own colour, stands up, both eyes and the core glow in `glow`, cracks light up, the ring wakes, the character's moving parts start (wheels, globe, gears, springs). |
| 3 | 40–59 | Бронированный | Clearly taller; at least four armour pieces or tools appear one after another. |
| 4 | 60–79 | Мастер … | Hovers; orbiting subject tokens; a crest above the head; seams glow. |
| 5 | 80–100 | Легендарный | Wings or a cape from the subject's shapes, head fire in `aura`, the sparks aura, the ring pulses. |

Rank 4 is named per character: Мастер железа, Мастер протоколов, Мастер тегов, Мастер стилей, Мастер событий, Мастер запросов. A new character needs its own body plan, palette, orbit tokens, crest and wing. If it looks like a recolour of an existing one, it is not done.
