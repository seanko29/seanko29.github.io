import type { PetState } from "../behavior/PetStateMachine";

const STATES: PetState[] = ["idle", "typing", "hover", "reaction", "sleep", "wake"];

/**
 * Browser-only debug panel. It is never shown in the desktop build unless the
 * app is opened with `?hud=1`.
 */
export function DevHud({
  state,
  clip,
  onPick,
}: {
  state: PetState;
  clip: string;
  onPick: (state: PetState) => void;
}) {
  return (
    <div className="hud">
      <div className="hud__row">
        <span className="hud__label">state</span>
        <strong>{state}</strong>
        <span className="hud__label">clip</span>
        <strong>{clip}</strong>
      </div>
      <div className="hud__row">
        {STATES.map((option) => (
          <button
            key={option}
            type="button"
            className={option === state ? "hud__btn hud__btn--on" : "hud__btn"}
            onClick={() => onPick(option)}
          >
            {option}
          </button>
        ))}
      </div>
      <p className="hud__hint">Type anywhere to make it type. Click it for a reaction.</p>
    </div>
  );
}
