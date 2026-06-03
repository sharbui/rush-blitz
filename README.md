# Rush Blitz

A 2D side-scrolling crowd shooter built with [Phaser 3](https://phaser.io/) + TypeScript + Vite.

You command a squad on the left that auto-fires straight to the right. A relentless
horde of enemies streams in from the right; reward gates let you grow your numbers or
upgrade your weapon (⚡). Survive the endless onslaught until the boss appears, then
take it down across its three attack phases.

## Features

- **Continuous horde** — basic soldiers spawn endlessly as a dense carpet; periodic
  shooting cavalry squads add bullet pressure.
- **Weapon progression** — five tiers (RIFLE → MINIGUN) unlocked via ⚡ reward gates,
  not kills; fire rate ramps up tier by tier.
- **Reward gates** — choose firepower vs. numbers; trap gates (`-`, `÷`) punish a wrong pick.
- **Three-phase boss** — spread, aimed burst, and 12-way scatter, with escort cavalry.
- **Kill combos** — chained kills ramp particles, screen shake, and a combo counter.

All art is procedurally generated in `BootScene` (no external assets); audio is a
zero-dependency Web Audio synth.

## Develop

```bash
npm install
npm run dev      # start the dev server (http://localhost:5173)
npm run build    # type-check + production build into dist/
```

## Design docs

See [`docs/難度與緊湊化規畫.md`](docs/難度與緊湊化規畫.md) for the full design and tuning notes.

## License

Copyright (C) 2026 sharbui.

This program is free software: you can redistribute it and/or modify it under
the terms of the **GNU Affero General Public License** as published by the Free
Software Foundation, either version 3 of the License, or (at your option) any
later version. See [`LICENSE`](LICENSE) for the full text.

Because it is AGPL-licensed, **anyone who runs a modified version of this game as
a network service (e.g. hosts it on a website) must make their modified source
available** under the same license, and must keep the copyright/author notices
intact. In other words: you're welcome to study, fork, and build on it — but you
can't quietly re-skin it and host it as your own closed product.

### Trademark / naming

The project name **"Rush Blitz"** and any associated logos are **not** covered by
the AGPL grant. Forks and derivative works must **not** use the "Rush Blitz" name
(or a confusingly similar one) to promote or brand their version. Please rename
your fork and credit this repository as the origin.
