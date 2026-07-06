# Axis & Allies Combat Calculator

A combat-odds calculator for Axis & Allies (Europe edition). Enter troop
counts for an attacker and a defender — land, air, sea, and AA guns — and it
runs a Monte Carlo simulation (naval battle, amphibious bombardment, and land
battle, auto-detected from what's entered) to report:

- Win / lose / tie percentages
- The expected order in which unit types are lost
- Round-by-round expected losses
- Total IPC value of expected losses

Live at **https://jokeena.github.io/axis-allies-calculator/**

## Development

```bash
npm install
npm run dev      # start the dev server
npm test         # run the engine test suite (Vitest)
npm run check    # type-check (tsc + svelte-check)
npm run build    # production build to dist/
```

Combat rules are modeled from the official Axis & Allies Europe rulebook
(`axis-allies-rules-europe.pdf`, kept at the repo root for reference).

Deploys automatically to GitHub Pages via GitHub Actions on push to `main`.
