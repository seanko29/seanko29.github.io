import { useCallback, useEffect, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import { DevHud } from "./components/DevHud";
import { Effects } from "./components/Effects";
import { Keyboard } from "./components/Keyboard";
import { Pet } from "./components/Pet";
import { SCENE } from "./behavior/config";
import type { PetState } from "./behavior/PetStateMachine";
import { usePet } from "./behavior/usePet";
import { hideWindow, isDesktop, setAlwaysOnTop, setClickThrough, startDragging } from "./platform/desktop";

/** Distance the cursor must travel with the button held before it counts as a drag. */
const DRAG_THRESHOLD_PX = 4;

const params = new URLSearchParams(window.location.search);
const FORCED_STATE = params.get("state") as PetState | null;
const PIN_STATE = params.get("pin") === "1";
const SHOW_HUD = params.get("hud") === "1" || (!isDesktop() && params.get("hud") !== "0");
const SHOW_BACKDROP = !isDesktop() && params.get("bg") !== "none";

export default function App() {
  const sceneRef = useRef<SVGSVGElement | null>(null);
  const { pose, state, clip, look, pressedKeys, burst, click, setState } = usePet(sceneRef);

  const [onTop, setOnTop] = useState(true);
  const [ghost, setGhost] = useState(false);
  const pressRef = useRef<{ x: number; y: number; dragging: boolean } | null>(null);

  // Screenshot / debugging hook: `?state=sleep` opens straight into that state.
  useEffect(() => {
    if (!FORCED_STATE) return;
    setState(FORCED_STATE);
    if (!PIN_STATE) return;
    const timer = window.setInterval(() => setState(FORCED_STATE), 1500);
    return () => window.clearInterval(timer);
  }, [setState]);

  useEffect(() => {
    setAlwaysOnTop(onTop);
  }, [onTop]);

  useEffect(() => {
    setClickThrough(ghost);
  }, [ghost]);

  // Press-and-move drags the window; press-and-release reacts. Handing off to
  // the OS only once the cursor has actually moved keeps clicks working.
  const onPointerDown = useCallback((event: React.PointerEvent) => {
    if (event.button !== 0) return;
    pressRef.current = { x: event.clientX, y: event.clientY, dragging: false };
  }, []);

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    const press = pressRef.current;
    if (!press || press.dragging) return;
    if (Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD_PX) return;
    press.dragging = true;
    startDragging();
  }, []);

  const onPointerUp = useCallback(() => {
    const press = pressRef.current;
    pressRef.current = null;
    if (press && !press.dragging) click();
  }, [click]);

  return (
    <div className={SHOW_BACKDROP ? "app app--preview" : "app"}>
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <svg
          ref={sceneRef}
          className="scene"
          viewBox={`0 0 ${SCENE.width} ${SCENE.height}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <Pet
            pose={pose}
            look={look}
            keyboard={<Keyboard pressed={pressedKeys} dimmed={state === "sleep"} />}
          />
          <Effects sleeping={state === "sleep"} burst={burst} />
        </svg>

        <Controls
          alwaysOnTop={onTop}
          clickThrough={ghost}
          onToggleAlwaysOnTop={() => setOnTop((value) => !value)}
          onToggleClickThrough={() => setGhost((value) => !value)}
          onHide={hideWindow}
        />
      </div>

      {SHOW_HUD && <DevHud state={state} clip={clip} onPick={setState} />}
    </div>
  );
}
