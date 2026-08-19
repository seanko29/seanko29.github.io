import { REACTION_CLIPS, type ClipName } from "../animation/animationConfig";
import { TIMING } from "./config";

export type PetState = "idle" | "typing" | "hover" | "reaction" | "sleep" | "wake";

export interface PetContext {
  state: PetState;
  previousState: PetState;
  lastActivityAt: number;
  mouseNearPet: boolean;
  isDragging: boolean;
}

/**
 * The pet's behaviour, as a small finite state machine.
 *
 *      keyboard activity
 *   IDLE ───────────────► TYPING ──timeout──► IDLE
 *     │                                         │
 *     │ long inactivity                         │
 *     ▼                                         │
 *   SLEEP ──activity──► WAKE ──► TYPING ◄───────┘
 *
 * A click interrupts whatever is playing with a REACTION and then restores the
 * state that was running before it.
 */
export class PetStateMachine {
  private ctx: PetContext;
  /** Which reaction clip the current REACTION state chose. */
  private reactionClip: ClipName = "reactionHop";
  private wakeStartedAt = 0;
  private pickReaction: () => ClipName;

  constructor(now: number, pickReaction?: () => ClipName) {
    this.ctx = {
      state: "idle",
      previousState: "idle",
      lastActivityAt: now,
      mouseNearPet: false,
      isDragging: false,
    };
    this.pickReaction =
      pickReaction ?? (() => REACTION_CLIPS[Math.floor(Math.random() * REACTION_CLIPS.length)]);
  }

  get state(): PetState {
    return this.ctx.state;
  }

  get context(): Readonly<PetContext> {
    return this.ctx;
  }

  /** The clip the renderer should be playing for the current state. */
  get clipName(): ClipName {
    switch (this.ctx.state) {
      case "typing":
        return "typing";
      case "hover":
        return "hover";
      case "sleep":
        return "sleep";
      case "wake":
        return "wake";
      case "reaction":
        return this.reactionClip;
      case "idle":
      default:
        return "idle";
    }
  }

  private transition(next: PetState) {
    if (next === this.ctx.state) return;
    this.ctx.previousState = this.ctx.state;
    this.ctx.state = next;
    if (next === "wake") this.wakeStartedAt = this.ctx.lastActivityAt;
  }

  /**
   * Something happened on the machine. We only record *that* input occurred and
   * when — never which keys, and never any content.
   */
  notifyActivity(now: number, kind: "keyboard" | "mouse" = "keyboard") {
    this.ctx.lastActivityAt = now;

    if (this.ctx.state === "sleep") {
      this.wakeStartedAt = now;
      this.transition("wake");
      return;
    }
    // A reaction or a wake plays to the end before anything else takes over.
    if (this.ctx.state === "reaction" || this.ctx.state === "wake") return;
    // Mouse movement wakes and resets the sleep timer, but only typing makes
    // the pet type.
    if (kind === "keyboard") this.transition("typing");
  }

  setMouseNear(near: boolean) {
    this.ctx.mouseNearPet = near;
  }

  setDragging(dragging: boolean) {
    this.ctx.isDragging = dragging;
  }

  /** Clicking the pet interrupts with a short reaction. */
  click(now: number) {
    this.ctx.lastActivityAt = now;
    if (this.ctx.state === "reaction") return;
    this.reactionClip = this.pickReaction();
    this.transition("reaction");
  }

  /** Called when a non-looping clip (reaction, wake) reaches its last frame. */
  onAnimationComplete() {
    if (this.ctx.state === "reaction") {
      // Come back to something sensible rather than, say, back to sleep.
      const back = this.ctx.previousState === "sleep" ? "idle" : this.ctx.previousState;
      this.transition(back === "reaction" ? "idle" : back);
      return;
    }
    if (this.ctx.state === "wake") {
      this.transition("typing");
    }
  }

  /**
   * Jump straight to a state. Used by the dev HUD and by screenshot tooling to
   * inspect a pose without waiting for the timers.
   */
  forceState(next: PetState, now: number) {
    this.ctx.lastActivityAt = now;
    if (next === "reaction") this.reactionClip = this.pickReaction();
    if (next === "wake") this.wakeStartedAt = now;
    if (next !== this.ctx.state) {
      this.ctx.previousState = this.ctx.state;
      this.ctx.state = next;
    }
  }

  /** Drive the time-based transitions. Call once per frame. */
  update(now: number) {
    const sinceActivity = now - this.ctx.lastActivityAt;

    switch (this.ctx.state) {
      case "wake":
        // Guard against a wake clip that never reports completion.
        if (now - this.wakeStartedAt > TIMING.wakeMs) this.transition("typing");
        break;

      case "typing":
        if (sinceActivity > TIMING.typingHoldMs) {
          this.transition(this.ctx.mouseNearPet ? "hover" : "idle");
        }
        break;

      case "idle":
        if (sinceActivity > TIMING.sleepAfterMs) this.transition("sleep");
        else if (this.ctx.mouseNearPet) this.transition("hover");
        break;

      case "hover":
        if (!this.ctx.mouseNearPet) this.transition("idle");
        else if (sinceActivity > TIMING.sleepAfterMs) this.transition("sleep");
        break;

      case "sleep":
      case "reaction":
        break;
    }
  }
}
