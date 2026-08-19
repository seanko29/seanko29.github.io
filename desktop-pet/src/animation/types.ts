/**
 * A `Pose` is one frame of animation.
 *
 * The character is drawn as vector art (see components/Pet.tsx) rather than as
 * PNG sprites, so a "frame" is a set of numbers describing where the parts sit
 * instead of an image path. Everything else in the animation system — clips,
 * frame rates, looping, the player — behaves exactly like a sprite pipeline,
 * so swapping in real sprite sheets later only means changing the renderer.
 */
export interface Pose {
  /** Vertical bob of the whole character, in scene units. Negative is up. */
  bodyY: number;
  /** Horizontal shift of the whole character. */
  bodyX: number;
  /** Body rotation in degrees; positive leans right. */
  bodyRot: number;
  /**
   * Squash and stretch. 1 = neutral, >1 = wider and shorter (landing),
   * <1 = taller and thinner (stretching up).
   */
  squash: number;
  /** Head tilt in degrees, on top of bodyRot. */
  headTilt: number;
  /** Arm rotation in degrees. 0 = resting at the side, positive = reaching down/forward. */
  leftArm: number;
  rightArm: number;
  /** Ear rotation in degrees, splayed outward from the head. */
  earTilt: number;
  /** 0 = fully closed lids, 1 = fully open. */
  eyeOpen: number;
  eyes: EyeStyle;
  mouth: MouthStyle;
  /** Blush opacity, 0..1. */
  blush: number;
}

export type EyeStyle = "normal" | "happy" | "sparkle" | "worried" | "wide";
export type MouthStyle = "w" | "smile" | "open" | "small" | "wobble" | "flat";

/** A named animation, played frame by frame at a fixed rate. */
export interface Clip {
  name: string;
  /** Playback rate of the artwork itself. Cute pets read well at 4–12 fps. */
  fps: number;
  loop: boolean;
  /**
   * When true the player blends between neighbouring frames, which suits slow
   * organic motion (breathing, sleeping). Snappy clips such as typing look
   * better held on hard frames.
   */
  interpolate: boolean;
  frames: Pose[];
}

/** Neutral pose that every keyframe is built from. */
export const BASE_POSE: Pose = {
  bodyY: 0,
  bodyX: 0,
  bodyRot: 0,
  squash: 1,
  headTilt: 0,
  leftArm: 0,
  rightArm: 0,
  earTilt: 0,
  eyeOpen: 1,
  eyes: "normal",
  mouth: "w",
  blush: 1,
};

/** Build a full pose from a partial keyframe description. */
export function pose(partial: Partial<Pose>): Pose {
  return { ...BASE_POSE, ...partial };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/**
 * Blend two poses. Numeric channels interpolate; discrete channels (eye and
 * mouth style) snap at the halfway point since there is nothing in between.
 */
export function blendPose(a: Pose, b: Pose, t: number): Pose {
  return {
    bodyY: lerp(a.bodyY, b.bodyY, t),
    bodyX: lerp(a.bodyX, b.bodyX, t),
    bodyRot: lerp(a.bodyRot, b.bodyRot, t),
    squash: lerp(a.squash, b.squash, t),
    headTilt: lerp(a.headTilt, b.headTilt, t),
    leftArm: lerp(a.leftArm, b.leftArm, t),
    rightArm: lerp(a.rightArm, b.rightArm, t),
    earTilt: lerp(a.earTilt, b.earTilt, t),
    eyeOpen: lerp(a.eyeOpen, b.eyeOpen, t),
    blush: lerp(a.blush, b.blush, t),
    eyes: t < 0.5 ? a.eyes : b.eyes,
    mouth: t < 0.5 ? a.mouth : b.mouth,
  };
}
