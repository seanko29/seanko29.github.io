/** The little widget toolbar, revealed when the cursor is over the pet. */
export function Controls({
  alwaysOnTop,
  clickThrough,
  onToggleAlwaysOnTop,
  onToggleClickThrough,
  onHide,
}: {
  alwaysOnTop: boolean;
  clickThrough: boolean;
  onToggleAlwaysOnTop: () => void;
  onToggleClickThrough: () => void;
  onHide: () => void;
}) {
  return (
    <div className="controls">
      <button
        type="button"
        className={alwaysOnTop ? "controls__btn controls__btn--on" : "controls__btn"}
        title="Always on top"
        onClick={onToggleAlwaysOnTop}
      >
        📌
      </button>
      <button
        type="button"
        className={clickThrough ? "controls__btn controls__btn--on" : "controls__btn"}
        title="Click-through (mouse passes to the app underneath)"
        onClick={onToggleClickThrough}
      >
        👻
      </button>
      <button type="button" className="controls__btn" title="Hide to tray" onClick={onHide}>
        ✕
      </button>
    </div>
  );
}
