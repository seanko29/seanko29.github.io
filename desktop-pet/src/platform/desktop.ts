/**
 * Thin wrappers around the Tauri window APIs.
 *
 * Every function is a no-op in a plain browser so the same app can run with
 * `npm run dev` for previewing and `npm run desktop` for real.
 */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

export function isDesktop(): boolean {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
}

async function currentWindow() {
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  return getCurrentWindow();
}

/** Keep the pet above other applications. */
export async function setAlwaysOnTop(enabled: boolean): Promise<void> {
  if (!isDesktop()) return;
  (await currentWindow()).setAlwaysOnTop(enabled);
}

/**
 * Click-through mode: the mouse passes straight to whatever is underneath, so a
 * transparent window does not swallow clicks meant for the editor behind it.
 */
export async function setClickThrough(enabled: boolean): Promise<void> {
  if (!isDesktop()) return;
  (await currentWindow()).setIgnoreCursorEvents(enabled);
}

/** Hand the drag off to the OS, which moves the frameless window natively. */
export async function startDragging(): Promise<void> {
  if (!isDesktop()) return;
  (await currentWindow()).startDragging();
}

export async function hideWindow(): Promise<void> {
  if (!isDesktop()) return;
  (await currentWindow()).hide();
}

export async function quitApp(): Promise<void> {
  if (!isDesktop()) return;
  const { invoke } = await import("@tauri-apps/api/core");
  await invoke("quit_app");
}
