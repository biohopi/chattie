# LAST LIGHT

A mobile-first, landscape 3D tactical survival game foundation. Original project identity and content; not affiliated with or endorsed by PUBG or Tencent.

## Current milestone

**Step 1 — application and renderer foundation.** The current build contains a responsive launch shell with the 3D environment lazy-loaded as a separate bundle, offline match configuration, settings, layout/online placeholders, fullscreen/orientation handling, and a procedural Three.js menu environment. Combat, player movement, loot, bots, buildings, and match HUD are planned milestones, not yet implemented.

See [PLAN.md](./PLAN.md) for the full architecture, asset policy, performance budgets, quality gates, and milestone sequence.

## Requirements

- Node.js 22.12+ (Vite 8 toolchain)
- npm 10+

## Run locally

```bash
npm install
npm run dev
```

## Verify

```bash
npm run typecheck
npm run build
npm run preview
```

## Architecture

- TypeScript owns application state and gameplay domain.
- Three.js owns 3D presentation; WebGL2 is the compatibility baseline.
- WGSL is capability-gated for WebGPU; GLSL paths preserve WebGL compatibility.
- Rust/WASM is the preferred future compute path after profiling; C++/WASM is optional for justified native-library integration.
- Web Workers host budgeted AI/navigation and asset tasks.
- HTML/CSS owns menus and HUD.
- GLB/glTF and KTX2/Basis are target shipping asset formats.

## Asset licensing

Do not add models, textures, fonts, or audio without recording source, license, attribution, and checksum in the asset manifest. Do not hotlink unverified assets from third-party CDNs. Complex character, building, weapon, and vehicle models must be authored or licensed production assets; procedural primitives are reserved for blockout, debug, and distant scenery.

## Deployment

The client is a static Vite build. Render deployment should be configured after confirming the intended Render workspace and repository connection. Publish directory: `dist`; build command: `npm install && npm run build`.
