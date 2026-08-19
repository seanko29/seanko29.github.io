# 2D Desktop Typing Pet — Development Plan

## 1. Goal

Build a lightweight desktop pet using a cute 2D character instead of a Minecraft/3D model.

The character lives on the desktop in a transparent frameless window and primarily sits in front of a keyboard and types while the user is working.

### Target experience

```text
Normal desktop

                         ┌──────────┐
                         │  clock   │
                         └──────────┘

                            ʕ•ᴥ•ʔ
                          ╱       ╲
                    ┌─────────────────┐
                    │    keyboard     │
                    └─────────────────┘

                     transparent window
```

The window itself should not visually appear. Only the character, keyboard, and optional UI should be visible.

---

## 2. Core Product Idea

The pet reacts to what the user is doing.

### Main states

1. **Typing**
   - Character types on a small keyboard.
   - Default working state.

2. **Idle**
   - Character stops typing.
   - Blinks, breathes, looks around, or moves slightly.

3. **Mouse Hover**
   - Character notices the cursor.
   - Eyes/head follow the cursor.

4. **Clicked**
   - Character gives a short reaction.
   - Example: wave, smile, surprised face, heart, bounce.

5. **Sleep**
   - After long inactivity, character sleeps.
   - `Zzz` animation appears.

6. **Wake**
   - Keyboard/mouse activity wakes the character.

### Optional later states

- Stretch
- Eat/snack
- Drink coffee
- Celebrate
- Angry typing
- Tired
- Focus/Pomodoro
- Notification reaction

---

## 3. Important Design Decision: 2D, Not 3D

We do **not** need Three.js, Blender rigs, GLB files, or a 3D engine.

Recommended architecture:

```text
Tauri 2
    │
    ├── Native transparent desktop window
    │
    └── React + TypeScript
             │
             ├── Character Renderer
             │      └── Sprite animation
             │
             ├── Keyboard
             │
             ├── Effects
             │
             └── Behavior State Machine
```

### Recommended technologies

- **Tauri 2**
  - Desktop application shell
  - Transparent window
  - Frameless window
  - Always-on-top
  - Window dragging
  - System tray
  - Start at login
  - Click-through mode

- **React + TypeScript**
  - UI and application state

- **PixiJS or HTML Canvas**
  - 2D character animation
  - Effects
  - Sprite rendering

For the first prototype, plain `<img>` elements or CSS animation are enough.

PixiJS becomes useful once we add:
- sprite sheets
- particles
- smooth transitions
- effects
- multiple animated objects

---

## 4. Character Asset Requirement

The most important asset is not a 3D model.

We need **2D animation frames**.

### Minimum Sprite Set

```text
character/
├── idle/
│   ├── idle_01.png
│   ├── idle_02.png
│   ├── idle_03.png
│   └── ...
│
├── typing/
│   ├── typing_01.png
│   ├── typing_02.png
│   ├── typing_03.png
│   └── ...
│
├── hover/
├── click/
├── sleep/
└── wake/
```

All frames should ideally have:

- identical canvas size
- transparent PNG background
- same character position
- same anchor point
- consistent scale

### Recommended first animation set

| State | Frames | Loop |
|---|---:|---|
| Idle | 4–8 | Yes |
| Typing | 6–12 | Yes |
| Blink | 2–4 | No |
| Click reaction | 4–8 | No |
| Sleep | 4–8 | Yes |
| Wake | 3–6 | No |

We can also use one larger sprite sheet rather than separate PNGs.

---

## 5. Typing Animation

This is the core feature.

### Simplest implementation

The keyboard is part of every typing frame.

```text
Frame 1       Frame 2       Frame 3

  pet           pet           pet
  / \           \ /           / \
 ─────         ─────         ─────
keyboard      keyboard      keyboard
```

This is the easiest approach because arm-to-keyboard alignment is already baked into the artwork.

### Better implementation later

Split the character and keyboard.

```text
Character sprite
      +
Keyboard sprite
      +
Key press effects
      =
Final scene
```

Benefits:

- keyboard skin can change
- keyboard can glow
- individual keys can react
- character skins can be replaced independently

---

## 6. Should Typing Reflect Real Keyboard Input?

There are two modes.

### V1 — Simulated Typing

When the computer is active:

```text
user working
     ↓
character typing loop
```

Recommended for MVP.

No global keystroke monitoring is needed.

### V2 — Activity-aware Typing

We detect that keyboard activity occurred without storing the actual typed content.

```text
keyboard activity
       ↓
activity event
       ↓
character typing animation
       ↓
timer expires
       ↓
idle animation
```

Important design principle:

> We should detect **activity**, not capture or store what the user types.

This makes the design safer and much less invasive.

---

## 7. Character State Machine

The pet should be driven by a simple finite-state machine.

```text
                keyboard activity
        ┌────────────────────────────┐
        │                            ↓
     ┌──────┐                    ┌────────┐
     │ IDLE │ ─────────────────→ │ TYPING │
     └──┬───┘                    └───┬────┘
        │                            │
        │ inactivity                 │ timeout
        │                            │
        ↓                            ↓
     ┌───────┐                  ┌────────┐
     │ SLEEP │                  │  IDLE  │
     └───┬───┘                  └────────┘
         │
         │ activity
         ↓
      ┌──────┐
      │ WAKE │
      └──┬───┘
         ↓
       TYPING
```

Mouse interaction can temporarily interrupt any normal state:

```text
IDLE / TYPING
      ↓ click
REACTION
      ↓ animation finishes
previous state
```

---

## 8. Suggested State Definition

```ts
type PetState =
  | "idle"
  | "typing"
  | "hover"
  | "reaction"
  | "sleep"
  | "wake";
```

State context:

```ts
interface PetContext {
  state: PetState;
  previousState: PetState;
  lastActivityAt: number;
  mouseNearPet: boolean;
  isDragging: boolean;
}
```

---

## 9. Desktop Window Requirements

The application window should behave like a widget.

### Required

- Transparent background
- No window frame
- No title bar
- Draggable
- Resizable or scalable
- Remembers its screen position
- Optional always-on-top
- System tray
- Close/hide controls
- Click-through mode

### Click-through is important

Otherwise a transparent 400×400 window can block applications underneath it.

Modes:

```text
Interactive Mode
mouse → pet

Click-through Mode
mouse → application underneath
```

A tray shortcut can switch between them.

---

## 10. Mouse Interaction

The screenshots suggest cursor-aware behavior.

We can implement:

### Cursor approaches pet

```text
cursor distance
     ↓
< threshold
     ↓
pet looks toward cursor
```

### Click

Random short reaction:

- heart
- smile
- bounce
- wave
- surprised
- annoyed

### Drag

Hold a specific draggable area or modifier key and move the pet around the desktop.

---

## 11. Animation Strategy

### MVP

Use frame-based sprite animations.

```ts
const animations = {
  idle: ["idle_01.png", "idle_02.png", ...],
  typing: ["typing_01.png", "typing_02.png", ...],
  sleep: ["sleep_01.png", "sleep_02.png", ...]
}
```

Renderer:

```text
60 Hz application loop
       ↓
animation timer
       ↓
select sprite frame
       ↓
draw
```

The artwork itself does not need 60 FPS.

A cute pixel/cartoon animation can work well at:

- 6 FPS
- 8 FPS
- 12 FPS

while the application renderer stays smooth.

---

## 12. Animation Timing Example

```text
Typing
8 FPS
6–10 frames

Idle
4 FPS
4–8 frames

Blink
8 FPS
3 frames

Sleep
4 FPS
4–6 frames

Reaction
10 FPS
6–12 frames
```

Slightly imperfect frame animation often looks better for this type of cute desktop pet than extremely smooth animation.

---

## 13. Asset Pipeline

Recommended workflow:

```text
Character reference
       ↓
Illustration
       ↓
Separate animation poses
       ↓
Transparent PNG frames
       ↓
Normalize canvas sizes
       ↓
Sprite sheet
       ↓
Application
```

Tools can be:

- Photoshop
- Procreate
- Clip Studio Paint
- Aseprite
- Figma for some simple elements

For pixel/sprite workflows, Aseprite is especially convenient.

---

## 14. Character IP / Licensing

If this exact character belongs to another artist, brand, sticker set, or commercial IP, we should verify usage rights before publicly distributing or monetizing the application.

For development there are two safe routes:

1. Use the supplied character only as a visual prototype/reference.
2. Create an original character with the same **cute desktop-pet concept** but original visual identity.

The technical architecture remains identical.

---

## 15. MVP Specification

### V0 — Technical Proof

Goal:

```text
transparent desktop
        +
animated character
        +
typing loop
```

Features:

- transparent window
- frameless
- movable
- PNG animation
- typing loop
- idle loop

No settings UI yet.

---

### V1 — Desktop Pet MVP

Features:

- Typing
- Idle
- Blink
- Click reaction
- Sleep
- Wake
- Mouse hover
- Dragging
- Always-on-top
- Click-through
- Save position
- System tray

This is the first version worth using every day.

---

### V2 — Smart Pet

Add:

- actual keyboard-activity detection
- mouse-activity detection
- Pomodoro mode
- focus timer
- battery reactions
- charging reaction
- time-of-day reactions
- notification reactions
- configurable skins

---

## 16. Repository Structure

```text
desktop-typing-pet/
│
├── src/
│   ├── components/
│   │   ├── Pet.tsx
│   │   ├── Keyboard.tsx
│   │   ├── Effects.tsx
│   │   └── Settings.tsx
│   │
│   ├── animation/
│   │   ├── AnimationPlayer.ts
│   │   ├── animationConfig.ts
│   │   └── sprites.ts
│   │
│   ├── behavior/
│   │   ├── PetStateMachine.ts
│   │   ├── activity.ts
│   │   └── interaction.ts
│   │
│   ├── stores/
│   │   └── settings.ts
│   │
│   └── App.tsx
│
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs
│   │   ├── window.rs
│   │   └── activity.rs
│   └── tauri.conf.json
│
├── assets/
│   ├── idle/
│   ├── typing/
│   ├── sleep/
│   ├── reaction/
│   └── keyboard/
│
└── package.json
```

---

## 17. Implementation Phases

### Phase 1 — Desktop Shell

- [ ] Create Tauri 2 + React + TypeScript project
- [ ] Create transparent window
- [ ] Remove title bar
- [ ] Make window draggable
- [ ] Add always-on-top
- [ ] Add click-through API
- [ ] Persist window position

**Deliverable:** transparent movable window containing a static PNG.

---

### Phase 2 — Animation Engine

- [ ] Define `PetState`
- [ ] Implement sprite-frame player
- [ ] Add idle animation
- [ ] Add typing animation
- [ ] Add frame timing
- [ ] Add transitions between animations

**Deliverable:** pet switches between idle and typing.

---

### Phase 3 — Character Artwork

Need:

- [ ] Idle sprite
- [ ] Typing sprite
- [ ] Blink sprite
- [ ] Sleep sprite
- [ ] Wake sprite
- [ ] Click/reaction sprite
- [ ] Keyboard asset

**Deliverable:** complete minimum animation set.

---

### Phase 4 — Interaction

- [ ] Track cursor inside widget
- [ ] Hover reaction
- [ ] Click reaction
- [ ] Drag pet
- [ ] Idle timer
- [ ] Sleep timer
- [ ] Wake on interaction

**Deliverable:** the character feels alive rather than being a GIF.

---

### Phase 5 — Desktop Integration

- [ ] System tray
- [ ] Always-on-top toggle
- [ ] Click-through toggle
- [ ] Character scale
- [ ] Position persistence
- [ ] Launch at startup
- [ ] Hide/show shortcut

---

### Phase 6 — Keyboard Activity

- [ ] Detect keyboard activity
- [ ] Do not log text
- [ ] Start typing animation when activity occurs
- [ ] Stop after inactivity timeout
- [ ] Add adjustable timeout

Example:

```text
key activity
   ↓
typing

no activity for 2 sec
   ↓
idle

no activity for 10 min
   ↓
sleep
```

---

### Phase 7 — Polish

- [ ] Animation easing
- [ ] Random idle variation
- [ ] Hearts / Zzz / sweat effects
- [ ] Sound toggle
- [ ] Multiple character skins
- [ ] Multiple keyboards
- [ ] Performance profiling
- [ ] Windows packaging
- [ ] macOS packaging

---

## 18. First Prototype Action Items

### A. Application

- [ ] Initialize repository
- [ ] Create Tauri app
- [ ] Create transparent 350×350 window
- [ ] Display one static character PNG
- [ ] Test transparency
- [ ] Test dragging

### B. Animation

Create only two animations first:

- [ ] `idle`
- [ ] `typing`

Do **not** build sleep, hover, reactions, settings, or system integrations until these two work.

### C. Artwork

First required asset:

```text
typing animation

frame 1
frame 2
frame 3
frame 4
frame 5
frame 6
```

The keyboard should initially be baked into the typing animation.

This avoids arm/keyboard alignment problems.

### D. State Logic

Implement:

```text
startup
   ↓
IDLE

after 3 sec
   ↓
TYPING

after 5 sec
   ↓
IDLE
```

At this stage the timing can be fake.

The objective is only to validate the renderer and animation transitions.

---

## 19. Recommended First Milestone

**Milestone: "The pet lives on my desktop."**

Success criteria:

- [ ] App launches
- [ ] No visible rectangular background
- [ ] Character appears on desktop
- [ ] Character can be dragged
- [ ] Character types
- [ ] Character returns to idle
- [ ] App stays lightweight
- [ ] Window position is remembered

Once this works, everything else is an incremental feature.

---

## 20. Suggested Development Order

```text
1. Transparent window
        ↓
2. Static character
        ↓
3. Typing sprite animation
        ↓
4. Idle animation
        ↓
5. Animation state machine
        ↓
6. Mouse reaction
        ↓
7. Sleep / wake
        ↓
8. Keyboard activity detection
        ↓
9. Tray + settings
        ↓
10. Polish
```

Do **not** start from system integrations or real keyboard events.

The first technical risk to solve is:

> Can the 2D character animate cleanly inside a transparent, draggable desktop window?

Once that works, the rest of the project is straightforward desktop application engineering.

---

## 21. Rough Timeline

### Day 1
- Tauri setup
- Transparent window
- Static character
- Dragging

### Day 2
- Sprite animation player
- Typing animation
- Idle animation

### Day 3
- State machine
- Click and hover
- Sleep/wake

### Day 4
- System tray
- Always-on-top
- Click-through
- Position persistence

### Day 5
- Keyboard activity
- Polish
- Packaging

**Technical prototype:** 1–2 days  
**Good MVP:** approximately 4–7 days  
**Polished desktop pet:** approximately 2–3 weeks, depending mostly on animation/art quality.

---

## 22. Final MVP Definition

The first version should do only this:

```text
               cute character
                     ↓
                 types ⌨

mouse approaches → notices cursor

click → short cute reaction

inactive → falls asleep

keyboard activity → wakes and types
```

That is enough for a convincing desktop pet product without needing any 3D pipeline.
