import { pose, type Clip } from "./types";

/**
 * Arm angles are in degrees, measured from "hand resting on the keyboard".
 * Negative lifts the paw off the keys, which is what a key tap looks like.
 */
const clip = (
  name: string,
  fps: number,
  loop: boolean,
  interpolate: boolean,
  frames: Clip["frames"],
): Clip => ({ name, fps, loop, interpolate, frames });

/** Sitting at the keyboard, breathing. Slow and soft, so it interpolates. */
const idle = clip("idle", 4, true, true, [
  pose({ bodyY: 0, squash: 1.0, leftArm: -1, rightArm: -2 }),
  pose({ bodyY: -1.6, squash: 0.985, leftArm: -3, rightArm: -1, earTilt: -1.5 }),
  pose({ bodyY: 0, squash: 1.0, leftArm: -2, rightArm: -3 }),
  pose({ bodyY: 0.6, squash: 1.012, leftArm: -1, rightArm: -1, earTilt: 1 }),
]);

/**
 * The core animation. Paws alternate on the keys with a small forward lean and
 * a bob on every other beat. Held on hard frames — the tiny stutter reads as
 * "tapping" far better than a smooth blend does.
 */
const typing = clip("typing", 9, true, false, [
  pose({ leftArm: -21, rightArm: -1, bodyY: -1.0, bodyRot: -1.2, mouth: "small" }),
  pose({ leftArm: -2, rightArm: -18, bodyY: 0.2, bodyRot: 1.0, mouth: "small" }),
  pose({ leftArm: -15, rightArm: -3, bodyY: -0.8, bodyRot: -0.8, mouth: "w" }),
  pose({ leftArm: 0, rightArm: -23, bodyY: 0.3, bodyRot: 1.3, mouth: "small" }),
  pose({ leftArm: -24, rightArm: -2, bodyY: -1.4, bodyRot: -1.4, mouth: "small" }),
  pose({ leftArm: -3, rightArm: -14, bodyY: 0.1, bodyRot: 0.8, mouth: "w" }),
  pose({ leftArm: -18, rightArm: -7, bodyY: -0.9, bodyRot: -0.6, mouth: "small" }),
  pose({ leftArm: -5, rightArm: -20, bodyY: 0.2, bodyRot: 1.1, mouth: "small" }),
]);

/** Noticed the cursor: ears perk up, paws pause on the keys. */
const hover = clip("hover", 5, true, true, [
  pose({ bodyY: -3, earTilt: -12, mouth: "small", eyeOpen: 1, blush: 1 }),
  pose({ bodyY: -4.4, earTilt: -15, mouth: "small", headTilt: 2 }),
  pose({ bodyY: -3, earTilt: -12.5, mouth: "small" }),
  pose({ bodyY: -4, earTilt: -14, mouth: "small", headTilt: -2 }),
]);

/** Long, slow breathing with the head tipped over. */
const sleep = clip("sleep", 2, true, true, [
  pose({ eyeOpen: 0, mouth: "small", headTilt: 7, bodyY: 0, squash: 1.0, blush: 0.85 }),
  pose({ eyeOpen: 0, mouth: "small", headTilt: 8.5, bodyY: 2.2, squash: 1.03, blush: 0.85 }),
  pose({ eyeOpen: 0, mouth: "small", headTilt: 7.5, bodyY: 0.4, squash: 1.0, blush: 0.85 }),
  pose({ eyeOpen: 0, mouth: "small", headTilt: 6, bodyY: -1.2, squash: 0.985, blush: 0.85 }),
]);

/** Startled awake, overshoots upward, then settles. Plays once. */
const wake = clip("wake", 12, false, false, [
  pose({ eyeOpen: 0.15, bodyY: -5, squash: 0.93, eyes: "wide", mouth: "small" }),
  pose({ eyeOpen: 1, bodyY: -12, squash: 0.86, eyes: "wide", mouth: "open", earTilt: -10 }),
  pose({ eyeOpen: 1, bodyY: -13, squash: 0.9, eyes: "wide", mouth: "open", earTilt: -9 }),
  pose({ eyeOpen: 1, bodyY: 2.5, squash: 1.12, eyes: "wide", mouth: "open", earTilt: 3 }),
  pose({ eyeOpen: 1, bodyY: -2, squash: 0.97, eyes: "normal", mouth: "w" }),
  pose({ eyeOpen: 1, bodyY: 0, squash: 1, eyes: "normal", mouth: "w" }),
]);

/** Click reaction: a happy little hop with both paws up. */
const reactionHop = clip("reactionHop", 11, false, false, [
  pose({ squash: 1.16, bodyY: 3, leftArm: 4, rightArm: 4, eyes: "happy" }),
  pose({ squash: 0.86, bodyY: -14, leftArm: -44, rightArm: -44, eyes: "happy", mouth: "open" }),
  pose({ squash: 0.9, bodyY: -19, leftArm: -52, rightArm: -52, eyes: "happy", mouth: "open" }),
  pose({ squash: 0.95, bodyY: -14, leftArm: -46, rightArm: -46, eyes: "happy", mouth: "open" }),
  pose({ squash: 1.14, bodyY: 2.5, leftArm: -12, rightArm: -12, eyes: "happy", mouth: "smile" }),
  pose({ squash: 0.98, bodyY: -3, leftArm: -4, rightArm: -4, eyes: "happy", mouth: "smile" }),
  pose({ squash: 1.02, bodyY: 0.5, eyes: "happy", mouth: "smile" }),
  pose({ eyes: "happy", mouth: "smile" }),
]);

/** Click reaction: waves one paw. */
const reactionWave = clip("reactionWave", 10, false, false, [
  pose({ rightArm: -30, headTilt: -2, eyes: "happy", mouth: "smile", bodyY: -2 }),
  pose({ rightArm: -68, headTilt: -5, eyes: "happy", mouth: "smile", bodyY: -3, bodyRot: -2 }),
  pose({ rightArm: -50, headTilt: -3, eyes: "happy", mouth: "smile", bodyY: -3 }),
  pose({ rightArm: -70, headTilt: -6, eyes: "happy", mouth: "smile", bodyY: -3.5, bodyRot: -2.5 }),
  pose({ rightArm: -52, headTilt: -3, eyes: "happy", mouth: "smile", bodyY: -3 }),
  pose({ rightArm: -66, headTilt: -5, eyes: "happy", mouth: "smile", bodyY: -3.5, bodyRot: -2 }),
  pose({ rightArm: -24, headTilt: -1, eyes: "happy", mouth: "smile", bodyY: -1 }),
  pose({ eyes: "happy", mouth: "smile" }),
]);

/** Click reaction: startled, then relieved. */
const reactionSurprise = clip("reactionSurprise", 10, false, false, [
  pose({ squash: 0.88, bodyY: -9, leftArm: -34, rightArm: -34, eyes: "wide", mouth: "open", earTilt: -12 }),
  pose({ squash: 0.9, bodyY: -11, leftArm: -40, rightArm: -40, eyes: "wide", mouth: "open", earTilt: -14 }),
  pose({ squash: 1.1, bodyY: 2, leftArm: -20, rightArm: -20, eyes: "wide", mouth: "open", earTilt: 2 }),
  pose({ squash: 1.0, bodyY: -1, leftArm: -10, rightArm: -10, eyes: "worried", mouth: "wobble" }),
  pose({ bodyY: 0, leftArm: -4, rightArm: -4, eyes: "worried", mouth: "wobble" }),
  pose({ eyes: "happy", mouth: "smile" }),
  pose({ eyes: "happy", mouth: "smile" }),
]);

/** Click reaction: sparkly eyes and a bounce. */
const reactionSparkle = clip("reactionSparkle", 9, false, false, [
  pose({ squash: 1.1, bodyY: 2, eyes: "sparkle", mouth: "open" }),
  pose({ squash: 0.9, bodyY: -9, eyes: "sparkle", mouth: "open", leftArm: -36, rightArm: -36 }),
  pose({ squash: 0.94, bodyY: -11, eyes: "sparkle", mouth: "open", leftArm: -42, rightArm: -42, headTilt: 3 }),
  pose({ squash: 1.08, bodyY: 1, eyes: "sparkle", mouth: "smile", leftArm: -18, rightArm: -18 }),
  pose({ squash: 0.98, bodyY: -2, eyes: "sparkle", mouth: "smile", leftArm: -6, rightArm: -6, headTilt: -2 }),
  pose({ eyes: "sparkle", mouth: "smile" }),
  pose({ eyes: "happy", mouth: "smile" }),
]);

export const CLIPS = {
  idle,
  typing,
  hover,
  sleep,
  wake,
  reactionHop,
  reactionWave,
  reactionSurprise,
  reactionSparkle,
} as const;

export type ClipName = keyof typeof CLIPS;

/** Click reactions are picked at random so the pet does not feel scripted. */
export const REACTION_CLIPS: ClipName[] = [
  "reactionHop",
  "reactionWave",
  "reactionSurprise",
  "reactionSparkle",
];

/** Which effect overlay, if any, a reaction should spawn. */
export const REACTION_EFFECT: Partial<Record<ClipName, "hearts" | "sparkles" | "sweat">> = {
  reactionHop: "hearts",
  reactionWave: "hearts",
  reactionSparkle: "sparkles",
  reactionSurprise: "sweat",
};
