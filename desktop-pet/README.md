# Chiikawa Desktop Pet

A cute 2D desktop pet that sits in a transparent, frameless window on your
desktop and types on a little keyboard while you work — the 2D answer to the
3D Minecraft pet widget.

Built as **Tauri 2 + React + TypeScript**, following [`PLAN.md`](./PLAN.md).

## Status

| Plan phase | State |
|---|---|
| 1 — Desktop shell (transparent, frameless, drag, always-on-top, click-through, saved position) | scaffolded |
| 2 — Animation engine (clips, frame timing, transitions) | done |
| 3 — Character artwork | done, as vector art rather than sprites |
| 4 — Interaction (hover, click, drag, idle/sleep/wake timers) | done |
| 5 — Desktop integration (tray, toggles) | done |
| 6 — Real keyboard activity | not started — see [Activity detection](#activity-detection) |
| 7 — Polish | partial (blink, effects, random reactions) |

**What has actually been verified:** the frontend runs in a browser, and every
state transition in the chart below is covered by an automated check
(`idle -> typing -> idle`, hover, click reaction, sleep, wake). `cargo check`
passes against Tauri 2.11.

**What has not:** the app has never been launched as a real window, so
transparency, the tray, dragging and click-through are untested at runtime, and
nothing has been bundled for macOS or Windows. Expect to shake something out on
the first `npm run desktop`.

## Running it

```bash
cd desktop-pet
npm install
```

**Browser preview** — no Rust toolchain needed, good for working on the artwork
and the animations:

```bash
npm run dev          # http://localhost:1420
```

The preview draws a checkerboard behind the pet to show which pixels are
actually transparent, and a debug panel for jumping between states.

**As a real desktop widget:**

```bash
npm run desktop      # tauri dev
npm run desktop:build
```

This needs a Rust toolchain (`rustup`) and the
[Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

### Handy URL flags (browser preview)

| Flag | Effect |
|---|---|
| `?state=sleep` | open straight into a state |
| `?pin=1` | keep re-applying that state, for screenshots |
| `?hud=0` | hide the debug panel |
| `?bg=none` | drop the checkerboard |

## How it behaves

```
        keyboard activity
  IDLE ──────────────────► TYPING ──2s idle──► IDLE
    │                                            │
    │ 90s with no input                          │
    ▼                                            │
  SLEEP ──any input──► WAKE ──► TYPING ◄─────────┘
```

- **cursor comes close** → ears perk up and the eyes follow the cursor (`hover`)
- **click** → one of four random reactions (hop, wave, surprise, sparkle) with
  hearts / sparkles / a sweat drop, then back to whatever it was doing
- **press and drag** → moves the window; press and release → counts as a click

Timings live in `src/behavior/config.ts`.

## Layout

```
src/
├── animation/
│   ├── types.ts             Pose, Clip, pose blending
│   ├── animationConfig.ts   every animation, written as keyframes
│   └── AnimationPlayer.ts   frame timing, looping, completion callbacks
├── behavior/
│   ├── PetStateMachine.ts   the state chart above
│   ├── activity.ts          "is the user active" (see below)
│   ├── config.ts            timings and scene geometry
│   └── usePet.ts            the render loop that ties it together
├── components/
│   ├── Pet.tsx              the character, drawn as rigged vector art
│   ├── Keyboard.tsx         the keyboard, with per-key press states
│   ├── Effects.tsx          Zzz, hearts, sparkles, sweat
│   ├── Controls.tsx         the on-hover widget toolbar
│   └── DevHud.tsx           browser-only debug panel
└── platform/desktop.ts      Tauri window calls, no-ops in a browser

src-tauri/                   transparent window, tray, position persistence
```

## About the artwork

The plan called for PNG sprite sheets. There are none yet, so the character is
drawn as **vector art driven by a pose**: `Pet.tsx` builds it from ears, body,
legs, arms and a face, and a `Pose` says where each part sits. Everything else
behaves exactly like a sprite pipeline — named clips, a frame rate per clip,
looping, completion callbacks — so an animation is written as numbers:

```ts
const idle = clip("idle", 4, true, true, [
  pose({ bodyY: 0,    squash: 1.0   }),
  pose({ bodyY: -1.6, squash: 0.985 }),
  ...
]);
```

Two things this buys us: the eyes can track the cursor (a fixed sprite cannot),
and new states cost a few lines instead of a new drawing.

**To move to real sprites later**, swap the innards of `Pet.tsx` for an `<image>`
that picks a frame — `AnimationPlayer.frameIndex` already gives you the index.
Nothing in `behavior/` has to change.

### Adding a state

1. Add a clip to `src/animation/animationConfig.ts`.
2. Add the state to `PetState` and map it in `PetStateMachine.clipName`.
3. Add the transitions in `PetStateMachine.update`.

## Activity detection

The pet reacts to *whether* you are typing, never to *what* you type. Nothing
reads `event.key`; no keystroke is stored or sent anywhere.

Right now that signal comes from window events, which in the desktop build only
covers input aimed at the pet's own window — so on the desktop it will mostly
look idle while you work in another app. Closing that gap is plan phase 6.
`activity.ts` already listens for a `pet://activity` event from the Rust side,
so the backend piece is the only part missing.

The privacy-preserving way to do it is to poll **seconds since last input**
(`CGEventSourceSecondsSinceLastEventType` on macOS, `GetLastInputInfo` on
Windows) rather than hooking keys — same result, no keylogging.

## Character rights

Chiikawa belongs to its creator. This is fine as a personal build, but the
artwork would need replacing with an original character before distributing or
monetising anything. The code does not care which character it draws.
