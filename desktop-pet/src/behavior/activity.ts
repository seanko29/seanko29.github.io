import { isDesktop } from "../platform/desktop";

export type ActivityKind = "keyboard" | "mouse";

/**
 * Reports *that* the user is active, never *what* they typed.
 *
 * Nothing here reads `event.key`, and no keystroke is stored or forwarded. The
 * only thing that leaves this module is a timestamp and whether the input came
 * from the keyboard or the mouse — which is all the pet needs in order to look
 * busy.
 *
 * In the browser preview this sees input aimed at the pet's own window. On the
 * desktop the pet's window is transparent and usually click-through, so system
 * wide activity has to come from the Rust side: if the backend ever emits a
 * `pet://activity` event, it is picked up here too (see src-tauri/README notes).
 */
export function watchActivity(onActivity: (kind: ActivityKind) => void): () => void {
  const keyboard = () => onActivity("keyboard");
  const mouse = () => onActivity("mouse");

  window.addEventListener("keydown", keyboard, { passive: true });
  window.addEventListener("mousedown", mouse, { passive: true });
  window.addEventListener("mousemove", mouse, { passive: true });
  window.addEventListener("wheel", mouse, { passive: true });

  let unlistenBackend: (() => void) | null = null;
  let cancelled = false;

  if (isDesktop()) {
    import("@tauri-apps/api/event")
      .then(({ listen }) =>
        listen<ActivityKind>("pet://activity", (event) => onActivity(event.payload ?? "keyboard")),
      )
      .then((unlisten) => {
        if (cancelled) unlisten();
        else unlistenBackend = unlisten;
      })
      .catch(() => {
        // No backend activity source wired up yet; window events are enough.
      });
  }

  return () => {
    cancelled = true;
    window.removeEventListener("keydown", keyboard);
    window.removeEventListener("mousedown", mouse);
    window.removeEventListener("mousemove", mouse);
    window.removeEventListener("wheel", mouse);
    unlistenBackend?.();
  };
}

/** Tracks the cursor in viewport pixels so the pet can look at it. */
export function watchPointer(onMove: (x: number, y: number) => void): () => void {
  const handler = (event: MouseEvent) => onMove(event.clientX, event.clientY);
  window.addEventListener("mousemove", handler, { passive: true });
  return () => window.removeEventListener("mousemove", handler);
}
