import { CLIPS, type ClipName } from "./animationConfig";
import { blendPose, type Clip, type Pose } from "./types";

/**
 * Plays one clip at a time and reports the pose for the current instant.
 *
 * The renderer runs at display rate (60 Hz or better) while the artwork runs at
 * the clip's own fps, so motion stays smooth without needing 60 drawings a
 * second. Non-looping clips fire `onComplete` once and then hold their last
 * frame until something else is played.
 */
export class AnimationPlayer {
  private clip: Clip;
  private clipName: ClipName;
  /** Seconds elapsed inside the current clip. */
  private elapsed = 0;
  private finished = false;
  private onComplete: (() => void) | null = null;

  constructor(initial: ClipName = "idle") {
    this.clipName = initial;
    this.clip = CLIPS[initial];
  }

  get current(): ClipName {
    return this.clipName;
  }

  get isFinished(): boolean {
    return this.finished;
  }

  /** Index of the artwork frame currently on screen. */
  get frameIndex(): number {
    const exact = this.elapsed * this.clip.fps;
    const last = this.clip.frames.length - 1;
    if (!this.clip.loop && exact >= last) return last;
    return Math.floor(exact) % this.clip.frames.length;
  }

  /**
   * Switch clips. Replaying the clip already on screen is ignored unless
   * `restart` is set, so a state machine can call this every tick safely.
   */
  play(name: ClipName, options: { restart?: boolean; onComplete?: () => void } = {}) {
    if (name === this.clipName && !options.restart) return;
    this.clipName = name;
    this.clip = CLIPS[name];
    this.elapsed = 0;
    this.finished = false;
    this.onComplete = options.onComplete ?? null;
  }

  /** Advance by `dt` seconds. */
  tick(dt: number) {
    if (this.finished) return;
    // Never let elapsed go negative: a negative frame index reads off the end
    // of the frame array. Callers can hand us a negative delta because the
    // first requestAnimationFrame timestamp may predate the loop's start time.
    this.elapsed = Math.max(0, this.elapsed + dt);

    if (!this.clip.loop) {
      const duration = this.clip.frames.length / this.clip.fps;
      if (this.elapsed >= duration) {
        this.elapsed = duration;
        this.finished = true;
        const done = this.onComplete;
        this.onComplete = null;
        done?.();
      }
    }
  }

  /** The pose to draw right now. */
  pose(): Pose {
    const { frames, fps, loop, interpolate } = this.clip;
    const exact = this.elapsed * fps;

    if (!loop) {
      // Hold the final frame once the clip has run out.
      const last = frames.length - 1;
      if (exact >= last) return frames[last];
    }

    const index = Math.floor(exact) % frames.length;
    if (!interpolate) return frames[index];

    const next = (index + 1) % frames.length;
    if (!loop && next === 0) return frames[index];
    return blendPose(frames[index], frames[next], exact - Math.floor(exact));
  }
}
