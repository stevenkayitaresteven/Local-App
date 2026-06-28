# Design

The original design canvas this product was built from.

- **`Umuturanyi.dc.html`** — the 21-screen design canvas (brand system, marketplace, item
  detail, community, map, Umuturanyi Pay, Ibimina, Umuganda, verticals, profile, chats,
  stories, settings…). It encodes the palette, type, Kinyarwanda glossary, and assumptions
  that drove the implementation.
- **`support.js`** — the runtime that renders the canvas.
- **`reference/`** — flat screenshots of the screen rows for quick reference.

The build mirrors this design's **palette** (orange `#EF6320`, green `#1E9E57`, ink
`#211C16`, sun `#F6C544`, sky `#2293C9`), **Kinyarwanda-first** copy, and **MoMo-first**
money model. These tokens live in code at `apps/mobile/src/theme/index.ts` and
`packages/shared`.

All artwork here is original to this project.
