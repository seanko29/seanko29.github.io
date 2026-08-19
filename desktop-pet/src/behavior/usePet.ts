import { useCallback, useEffect, useRef, useState } from "react";
import { AnimationPlayer } from "../animation/AnimationPlayer";
import { REACTION_EFFECT, type ClipName } from "../animation/animationConfig";
import type { Pose } from "../animation/types";
import { KEYS } from "../components/Keyboard";
import type { Burst } from "../components/Effects";
import { pawScenePosition } from "../components/Pet";
import { watchActivity, watchPointer } from "./activity";
import { SCENE, TIMING } from "./config";
import { PetStateMachine, type PetState } from "./PetStateMachine";

/**
 * React updates are capped well below the display rate. The artwork itself runs
 * at 2–12 fps, so redrawing 30 times a second already looks smooth and keeps
 * the pet cheap enough to leave running all day.
 */
const RENDER_HZ = 30;

export interface PetView {
  pose: Pose;
  state: PetState;
  clip: ClipName;
  look: { x: number; y: number };
  pressedKeys: ReadonlySet<string>;
  burst: Burst | null;
}

/** Cheap deterministic jitter so the pet does not hit the same keys every loop. */
function jitter(frame: number, salt: number): number {
  const n = Math.sin((frame + 1) * 12.9898 + salt * 78.233) * 43758.5453;
  return (n - Math.floor(n)) * 2 - 1;
}

/** Nearest key to a paw, so key presses line up with where the paws actually are. */
function keyUnderPaw(x: number, y: number): string | null {
  let best: string | null = null;
  let bestDistance = Infinity;
  for (const key of KEYS) {
    const dx = x - (key.x + key.width / 2);
    const dy = y - (key.y + key.height / 2);
    const distance = dx * dx + dy * dy;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = key.id;
    }
  }
  return bestDistance < 30 * 30 ? best : null;
}

export function usePet(sceneRef: React.RefObject<SVGSVGElement | null>) {
  const playerRef = useRef<AnimationPlayer | null>(null);
  const machineRef = useRef<PetStateMachine | null>(null);
  const burstIdRef = useRef(0);

  if (playerRef.current === null) playerRef.current = new AnimationPlayer("idle");
  if (machineRef.current === null) machineRef.current = new PetStateMachine(performance.now());

  const [view, setView] = useState<PetView>(() => ({
    pose: playerRef.current!.pose(),
    state: "idle",
    clip: "idle",
    look: { x: 0, y: 0 },
    pressedKeys: new Set<string>(),
    burst: null,
  }));

  // Mutable per-frame state, kept in refs so the animation loop never restarts.
  const pointerRef = useRef({ x: 0, y: 0, seen: false });
  const blinkRef = useRef({ nextAt: 0, startedAt: -1 });
  const burstRef = useRef<Burst | null>(null);

  const setState = useCallback((next: PetState) => {
    machineRef.current!.forceState(next, performance.now());
  }, []);

  const click = useCallback(() => {
    machineRef.current!.click(performance.now());
  }, []);

  useEffect(() => {
    const stopActivity = watchActivity((kind) => {
      machineRef.current!.notifyActivity(performance.now(), kind);
    });
    const stopPointer = watchPointer((x, y) => {
      pointerRef.current = { x, y, seen: true };
    });
    return () => {
      stopActivity();
      stopPointer();
    };
  }, []);

  useEffect(() => {
    const player = playerRef.current!;
    const machine = machineRef.current!;
    let raf = 0;
    let lastTime = performance.now();
    let lastRender = 0;
    let lastState = machine.state;

    const scheduleBlink = (now: number) => {
      const { blinkMinMs, blinkMaxMs } = TIMING;
      blinkRef.current.nextAt = now + blinkMinMs + Math.random() * (blinkMaxMs - blinkMinMs);
    };
    scheduleBlink(performance.now());

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const dt = Math.max(0, Math.min((now - lastTime) / 1000, 0.1));
      lastTime = now;

      // --- cursor proximity -------------------------------------------------
      let look = { x: 0, y: 0 };
      const svg = sceneRef.current;
      if (svg && pointerRef.current.seen) {
        const rect = svg.getBoundingClientRect();
        const scale = rect.width / SCENE.width;
        const headX = rect.left + SCENE.petCenterX * scale;
        const headY = rect.top + (SCENE.petCenterY - 17) * scale;
        const dx = pointerRef.current.x - headX;
        const dy = pointerRef.current.y - headY;
        const distance = Math.hypot(dx, dy);
        machine.setMouseNear(distance < TIMING.hoverRadiusPx * scale);
        const reach = Math.max(distance, 1);
        look = {
          x: Math.max(-1, Math.min(1, (dx / reach) * Math.min(1, distance / 90))),
          y: Math.max(-1, Math.min(1, (dy / reach) * Math.min(1, distance / 90))),
        };
      }

      // --- behaviour --------------------------------------------------------
      machine.update(now);
      const wanted = machine.clipName;
      // Re-entering `reaction` must replay even when the randomiser happens to
      // pick the clip that is already loaded, or a second click does nothing.
      const reentered = machine.state !== lastState && machine.state === "reaction";
      lastState = machine.state;

      if (wanted !== player.current || reentered) {
        player.play(wanted, { restart: true, onComplete: () => machine.onAnimationComplete() });
        burstRef.current =
          machine.state === "reaction" && REACTION_EFFECT[wanted]
            ? { id: ++burstIdRef.current, kind: REACTION_EFFECT[wanted]! }
            : null;
      }
      player.tick(dt);

      // --- blink overlay ----------------------------------------------------
      const blink = blinkRef.current;
      if (blink.startedAt < 0 && now >= blink.nextAt && machine.state !== "sleep") {
        blink.startedAt = now;
        scheduleBlink(now);
      }
      let blinkFactor = 1;
      if (blink.startedAt >= 0) {
        const t = (now - blink.startedAt) / TIMING.blinkDurationMs;
        if (t >= 1) blink.startedAt = -1;
        else blinkFactor = Math.abs(t * 2 - 1);
      }

      // --- throttle the actual React update ---------------------------------
      if (now - lastRender < 1000 / RENDER_HZ) return;
      lastRender = now;

      const pose = player.pose();
      const shown: Pose = { ...pose, eyeOpen: pose.eyeOpen * blinkFactor };

      const pressed = new Set<string>();
      if (machine.state === "typing") {
        const frameIndex = player.frameIndex;
        for (const side of ["left", "right"] as const) {
          const value = side === "left" ? pose.leftArm : pose.rightArm;
          if (value > -9) {
            const paw = pawScenePosition(pose, side);
            const key = keyUnderPaw(
              paw.x + jitter(frameIndex, side === "left" ? 1 : 2) * 26,
              paw.y + 4,
            );
            if (key) pressed.add(key);
          }
        }
      }

      setView({
        pose: shown,
        state: machine.state,
        clip: player.current,
        look: machine.state === "sleep" ? { x: 0, y: 0 } : look,
        pressedKeys: pressed,
        burst: machine.state === "reaction" ? burstRef.current : null,
      });
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [sceneRef]);

  return { ...view, click, setState };
}
