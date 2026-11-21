# CHATTIE — Mobile Tactical Battle Royale
## Engineering plan and production architecture

**Project:** CHATTIE (working game title: **LAST LIGHT**)  
**Repository:** `biohopi/chattie`  
**Product target:** mobile-first, landscape, browser-based 3D tactical battle royale  
**Primary client:** TypeScript + Three.js  
**Simulation target:** deterministic 60 Hz fixed-step gameplay, rendered with an adaptive 60 FPS target  
**Initial scope:** offline matches with configurable bots; online is a clearly marked UI-only destination and contains no networking implementation.

---

## 1. Product principles and scope

This is a full game architecture, not a single-file demo. The first repository milestone establishes the foundation; the later milestones add the playable systems in dependency order. The quality bar is a polished mobile game interface, a readable and atmospheric 3D battlefield, responsive multi-touch input, predictable simulation, and measured performance.

The game will use **original branding, map composition, interface artwork, audio, and licensed assets**. It will implement battle-royale genre mechanics without copying PUBG's proprietary code, maps, logos, character designs, interface artwork, or other protected assets.

### Required launch and match experience

- Landscape-first presentation with an explicit fullscreen action and a portrait-orientation guidance screen.
- Launch destinations: Settings, Offline Play, Online Play (UI placeholder only), and Customize Layout.
- Offline setup: Start Match, bots-per-team counter defaulting to zero, and team-count control defaulting to two.
- Match HUD: pause, fire, scope, backpack, two primary weapon slots, weapon swap, jump, crouch, heal, and a fixed virtual joystick.
- Fixed joystick with sprint at maximum forward displacement; independent touch surfaces for camera look and combat controls.
- Minimap with player heading, field-of-view cone, and visible player markers.
- Pause flow: resume, return to lobby, and customize layout.
- Loot rarity, two-weapon loadout, inventory, multi-floor buildings, and tactical bot opponents.
- No multiplayer server, sockets, matchmaking, or synchronization code in this project scope. The Online destination remains an honest placeholder.

### Non-goals and guardrails

- No fake claim of a complete PUBG Mobile replica or production parity without a complete verified game and device test matrix.
- No complex character, weapon, or vehicle models assembled from primitive meshes. Primitives are allowed for greyboxing, debug visualization, and distant procedural scenery only.
- No unlicensed CDN asset hotlinks in the shipped build. Third-party content must have a recorded license, attribution, source, checksum, and local build-time copy where permitted.
- No online backend implementation. The requested online panel is presentation-only.
- No requirement to ship both Rust and C++ physics engines. Rust/WASM is the primary path for new compute kernels; C++/WASM is an optional adapter for a specific vetted native library where it provides a real advantage.

---

## 2. Layered technical architecture

### 2.1 Presentation and application shell

**HTML + CSS + TypeScript**

- Semantic DOM for launch, settings, pause, lobby, inventory, customization, notifications, and accessibility labels.
- CSS safe-area handling, landscape layouts, touch-target sizing, focus states, motion-reduction support, and responsive HUD profiles.
- DOM stays responsible for interface and text; Three.js owns the 3D world. Avoid rendering the complete HUD into a canvas.
- A centralized UI state store publishes immutable, typed state changes. UI panels subscribe to relevant state rather than polling the simulation.
- Fullscreen and orientation lock are user-gesture initiated, with graceful browser fallbacks.

### 2.2 Game domain and simulation

**TypeScript**

Proposed modules:

- `core/`: lifecycle, clock, deterministic random stream, typed event bus, diagnostics, device capability profile.
- `game/`: match state machine, teams, player state, weapons, loot, inventory, damage, healing, safe-zone rules.
- `entities/`: player, bot, projectile, loot container, interactable, building/door, vehicle (later milestone).
- `systems/`: input, movement, combat, interaction, inventory, loot spawning, bot orchestration, zone, minimap, audio cues.
- `world/`: world manifest, streaming cells, spawn points, building floors, navigation metadata, collision proxies.
- `ui/`: screen state, HUD composition, layout persistence, accessibility and touch feedback.

The simulation uses a fixed-step accumulator (nominal 60 Hz) with render interpolation. Rendering must never own authoritative gameplay state. Systems communicate via typed events and explicit commands. Random decisions use seeded streams so offline bugs can be reproduced from a match seed and event log.

### 2.3 Rendering

**Three.js, WebGL2 baseline, WebGPU/WGSL path**

- Three.js owns scene graph, camera, material bindings, GLB loading, culling, instancing, and rendering lifecycle.
- WebGL2 is the compatibility baseline for broad mobile support.
- WebGPU is capability-detected, not assumed. WGSL compute/render work is introduced behind a renderer capability interface.
- Use separate render profiles for low, balanced, and high device tiers. Dynamic resolution and post-processing are adaptive features, never prerequisites for correct gameplay.
- World and UI cameras are separated. Use explicit camera layers for world, weapon, minimap, effects, and debug overlays.
- Lighting: baked or authored environment contribution where practical, restrained real-time directional lighting, fog and sky treatment, material consistency, and optional post-processing by device tier.
- LOD groups, instancing, frustum culling, spatial cells, simplified collision meshes, and texture budgets are first-class asset metadata.

### 2.4 GPU shader strategy

**WGSL and GLSL**

- WGSL owns WebGPU-only compute experiments and future advanced material/effect paths.
- GLSL is retained for WebGL2-compatible material/effect implementations and shader fallback.
- Shader features expose capability flags and matched visual fallbacks. Missing WebGPU support must not block the match.
- First shader candidates: foliage wind, water surface, atmospheric particles, muzzle flash, scope lens treatment, and compact minimap/FOV rendering.
- Avoid expensive full-screen effects on low-tier devices. Measure GPU time before enabling bloom, screen-space reflections, ambient occlusion, or temporal effects.

### 2.5 Heavy computation

**Rust + WebAssembly primary; C++ + WebAssembly optional**

Rust modules are the preferred location for CPU-heavy deterministic kernels once profiles show that TypeScript is the bottleneck:

- navigation graph queries and path smoothing;
- batched spatial queries and broadphase helpers;
- visibility/line-of-sight candidate filtering;
- offline bot planning batches and large loot/spawn calculations.

C++/WASM is reserved for a concrete, justified integration with a vetted native library. It must implement the same narrow adapter contract as the Rust path. Do not maintain two independent versions of the same game rules.

WASM interfaces use versioned, typed buffers and explicit memory ownership. No per-frame string serialization or repeated heap allocation across the JS/WASM boundary.

### 2.6 Background work

**Web Workers**

- Dedicated worker for bot planning and expensive navigation queries.
- Worker for asset preprocessing/decoding tasks where browser APIs and the relevant decoder permit it.
- Optional worker for telemetry aggregation and replay/event-log compression.
- Use transferable typed arrays, bounded queues, cancellation tokens, and frame-budgeted result application.
- Main-thread input, camera, UI, and render scheduling remain responsive even when workers are saturated.

### 2.7 Networking boundary

The Online Play screen is a static product/UI placeholder. This repository will not add Node.js WebSocket rooms, synchronization, or matchmaking. The game domain should keep simulation commands independent of transport so a future separately scoped server can be integrated without rewriting gameplay.

---

## 3. World, assets, and content pipeline

### 3.1 Asset acquisition policy

- Source high-quality GLB/glTF assets from established libraries or commissioned production; record provenance and license before use.
- Prefer locally hosted, versioned assets over runtime hotlinks. A CDN may serve the versioned project asset bundle, but the game must pin exact revisions and include a manifest.
- Complex buildings, weapons, vehicles, and characters must be actual authored or licensed models. Procedural generation is appropriate for terrain, foliage placement, distant silhouettes, debris scatter, and other repeatable environment dressing.
- Include an asset manifest with id, URI, checksum, license, attribution, units, bounds, LODs, collision proxy, texture references, and budget class.
- Never bundle assets whose license is unclear or incompatible with the intended distribution.

### 3.2 GLB/glTF preparation

Build-time pipeline:

1. Validate source model and license metadata.
2. Normalize units, origin, forward axis, naming, hierarchy, and material conventions.
3. Remove unused nodes, cameras, and embedded data.
4. Generate mesh LODs and simplified collision proxies.
5. Optimize vertex/index buffers using Meshopt or Draco where appropriate.
6. Validate skinning, animation clips, material maps, and level-of-detail transitions.
7. Generate a deterministic manifest and checksums.
8. Run a visual regression scene before merging asset changes.

### 3.3 Texture pipeline

- KTX2/Basis Universal is the shipping texture format.
- Generate mipmaps and choose texture formats by target GPU capability.
- Use texture atlases/arrays where they reduce draw calls without producing excessive waste.
- Define per-device texture budgets and maximum dimensions.
- Keep source textures and reproducible conversion settings outside the runtime bundle; never repeatedly transcode already optimized files.

### 3.4 World layout

The initial offline map is an original, streamed environment divided into spatial cells. Each cell declares static render assets, collision data, nav links, sound zones, loot anchors, and building entries.

Building archetypes support one, two, and three traversable storeys. Each floor provides explicit navigation links, stair/ladder transitions, openings, interaction anchors, occlusion metadata, and deterministic loot sockets. Visual geometry and gameplay collision are separate assets.

---

## 4. Core gameplay systems

### 4.1 Match lifecycle

Lobby → match initialization → deployment/spawn → active survival → final team resolution → results → lobby.

Each match stores a seed, ruleset version, team configuration, bot configuration, and compact event log. Returning to the lobby must dispose match-only entities, workers, audio, GPU resources, and world cells.

### 4.2 Movement and combat

- Character controller with grounded/airborne states, slope handling, capsule collision, acceleration, braking, sprint, crouch, jump, and fall handling.
- Weapon handling separates fire mode, cadence, recoil, spread, reload, ammunition, ADS/scope, hit validation, damage, and animation events.
- Projectiles/hitscan are selected per weapon definition. Effects are cosmetic clients of authoritative offline simulation events.
- Weapon swap and reload transitions are explicit state machines; invalid actions are rejected with clear UI feedback.

### 4.3 Loot and inventory

- Data-driven loot tables with configurable rarity weights and location modifiers.
- World pickups, containers, interaction distance, pickup feedback, ammo, healing, armor, attachments, and weapons.
- Exactly two primary weapon slots in the match loadout.
- Backpack storage is not constrained by a tiny fixed slot grid; item stacking, weight/capacity rules (if enabled), quick-use slots, and sorting remain data-driven.
- Loot generation uses the match seed and stable spawn identifiers so it can be reproduced.

### 4.4 Bot AI

Layered bot architecture:

1. Perception: field of view, range, sound events, recent damage, and visibility checks.
2. Memory: last-known position, threat score, loot targets, health/ammo state, squad/team context.
3. Decision: utility/behavior selection for loot, patrol, investigate, engage, take cover, heal, reload, flank, retreat, and zone rotation.
4. Navigation: building-aware, multi-floor graph with local avoidance and path smoothing.
5. Execution: movement/combat commands passed through the same gameplay interfaces as the player.
6. Difficulty: separate tuning profiles for reaction delay, accuracy, aim stability, perception, and planning budget.

AI never writes directly to render objects. Planning is budgeted and distributed across frames/workers; deterministic seeds and recorded decisions support repeatable debugging.

### 4.5 Mobile control model

- Fixed joystick on the lower-left.
- Camera-look surface on the remaining screen, with independent shoot/scope/jump/crouch/heal/swap/backpack/pause controls.
- Independent pointer IDs; each touch owns a control until release/cancel. No accidental pointer stealing between UI zones.
- Sprint activates at a configurable maximum joystick threshold; hysteresis prevents toggling at the edge.
- Layout editor supports drag, scale, opacity, reset, safe-area snapping, and per-device persistence.
- Input is normalized and routed to gameplay actions; UI buttons do not directly mutate simulation state.

### 4.6 Minimap

- Top-down camera or generated 2D map texture with player heading.
- Heading/FOV wedge driven by the active camera transform and FOV.
- Player dots filtered by visibility/rules; the minimap must not reveal hidden enemies unless the game rules explicitly allow it.
- Update rate is decoupled from the main render loop and can be reduced on low-tier devices.

---

## 5. Mobile performance and quality gates

A 60 FPS target is an optimization objective, not a promise for every phone. Correctness and touch responsiveness take priority over visual effects when the device is constrained.

### Runtime budgets to measure and tune

- Frame time target: 16.67 ms at 60 Hz; track CPU and GPU separately.
- Input-to-visible-response: keep touch response immediate; never block the main thread on asset or AI work.
- Render resolution: cap device pixel ratio and adapt internal resolution from measured frame time.
- Memory: define texture, geometry, decoded-asset, and worker-buffer budgets per device tier.
- Draw calls: use batching/instancing, material consolidation, spatial streaming, and measured LOD thresholds.
- Asset streaming: prioritize visible/nearby cells, avoid duplicate decode, cancel stale work, and release unused resources.
- Thermal behavior: lower resolution/effects/AI budgets under sustained load.

### Quality gates

1. TypeScript strict typecheck passes.
2. Production build passes.
3. Unit tests cover state machines, inventory constraints, deterministic loot, and movement/math helpers.
4. Browser smoke test confirms launch, settings, offline configuration, orientation guidance, and fullscreen behavior.
5. Mobile touch test covers simultaneous look + joystick + fire, pointer cancellation, and safe areas.
6. 3D validation test checks asset loading, missing-resource handling, context loss, and renderer fallback.
7. Bot scenario tests cover multi-floor navigation, threat selection, healing, cover, and zone rotation.
8. Performance runs on representative low/mid/high Android devices record frame time, memory, draw calls, and thermal degradation.
9. All third-party assets pass license/provenance checks.

---

## 6. Repository layout

```text
/
├── PLAN.md
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
│   └── assets/
│       └── manifest.json
├── src/
│   ├── main.ts
│   ├── styles.css
│   ├── core/
│   ├── game/
│   ├── entities/
│   ├── systems/
│   ├── world/
│   ├── rendering/
│   ├── workers/
│   ├── ui/
│   ├── input/
│   └── wasm/
├── native/
│   ├── rust/
│   └── cpp/
├── tests/
└── scripts/
```

The tree is introduced incrementally; empty directories are represented by the first real source modules rather than placeholder files.

---

## 7. Milestone sequence

### Step 1 — Repository and runtime foundation (this checkpoint)
- Commit this architecture plan.
- Establish strict TypeScript/Vite/Three.js toolchain.
- Build the responsive launch shell and landscape/fullscreen behavior.
- Initialize a mobile-aware Three.js menu world with a clean lifecycle and graceful WebGL fallback.
- Add project documentation and a deterministic asset manifest contract.
- Acceptance: the app builds, the launch destinations respond, and renderer resources have explicit resize/disposal ownership.

### Step 2 — Rendering and asset foundation
- Device capability profiles, render-quality selection, diagnostics, asset registry.
- GLB/glTF + KTX2 loading, loader worker strategy, environment lighting, shader capability interface.
- Add first licensed high-quality environment assets and their visual regression scene.

### Step 3 — World streaming and traversable buildings
- Original map blockout with spatial cells, streaming/eviction, collision proxies and nav metadata.
- One-, two-, and three-storey building archetypes with traversable floors and loot sockets.
- Camera collision and world interaction infrastructure.

### Step 4 — Player controller and multi-touch input
- Fixed joystick, camera look, sprint threshold, gesture ownership, jump/crouch.
- Fullscreen/orientation/safe-area refinement and draggable HUD-layout persistence.
- Automated touch conflict tests.

### Step 5 — Combat and weapon handling
- Weapon definitions, firing, scope/ADS, recoil, reload, swap, damage and feedback.
- Animation hooks, GLB weapon rigs, muzzle/impact effects, sound events.
- Two-primary-weapon loadout behavior.

### Step 6 — Loot, healing, backpack and HUD
- Loot rarity tables, world pickups, interaction, unlimited-space inventory model.
- Healing/quick-use, ammo/attachments, inventory presentation and minimap.
- Pause menu and lobby loop.

### Step 7 — Bot intelligence
- Perception, memory, tactical decisions, cover, healing, looting and zone navigation.
- Multi-floor navigation and worker-budgeted planning.
- Difficulty controls and repeatable bot scenario tests.

### Step 8 — Rust/WASM compute
- Profile first; move only proven hotspots behind a stable adapter.
- Rust navigation/spatial kernels, transferable buffers, worker orchestration.
- Optional C++/WASM adapter only for a specific selected native dependency.

### Step 9 — Visual/audio polish and performance hardening
- Licensed character/weapon/environment asset pass, KTX2 conversion, animation, lighting and selective post-processing.
- Soundscape, weapon audio, ambience, UI feedback, particles and shader enhancements.
- Device-tier tuning, memory leak checks, thermal/performance runs.

### Step 10 — Release engineering and hosting
- Reproducible builds, CI typecheck/test/build, asset/license report, deploy preview.
- Render static-site deployment for the browser client once the repo is connected to the intended Render workspace.
- Verify production URL, mobile launch, cache headers, asset delivery and rollback path.

---

## 8. Step 1 completion checklist

- [x] Architecture and scope documented in this file.
- [ ] Toolchain pinned to compatible current stable packages.
- [ ] Application shell and launch navigation implemented.
- [ ] Landscape guidance and user-gesture fullscreen implemented.
- [ ] Three.js menu scene initialized with capped pixel ratio and explicit disposal.
- [ ] WebGL failure leaves the UI usable.
- [ ] Asset manifest and contributor setup documented.
- [ ] Typecheck and production build verified before marking the milestone complete.

**Step 1 status — complete (2026-11-21):** The application shell, responsive navigation, offline setup controls, settings panel, layout/online placeholders, fullscreen/orientation guidance, lazy-loaded Three.js menu environment, disposal lifecycle, asset manifest, and project documentation are committed. Render's production typecheck and build passed and the deployment reached `live`. The renderer is deferred from the initial UI bundle; the latest build emitted a 5.29 kB (2.15 kB gzip) entry and a separate 538.10 kB (133.36 kB gzip) Three.js environment chunk. The latter is loaded only when the 3D menu environment is needed. Browser/device interaction and sustained 60 FPS have not yet been verified on physical Android hardware. A 60 FPS target and production-ready quality remain acceptance goals to demonstrate by device testing, not assumptions from architecture alone.
