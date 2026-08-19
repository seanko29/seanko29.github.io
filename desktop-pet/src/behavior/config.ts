/** All the tunable timings in one place, in milliseconds. */
export const TIMING = {
  /** Keep typing this long after the last keystroke before dropping to idle. */
  typingHoldMs: 2000,
  /** Idle this long with no input at all and the pet falls asleep. */
  sleepAfterMs: 90_000,
  /** How long the wake animation blocks other transitions. */
  wakeMs: 700,
  /** Cursor distance (in px, from the pet's centre) that counts as "nearby". */
  hoverRadiusPx: 150,
  /** Blink cadence: a blink is scheduled randomly inside this window. */
  blinkMinMs: 2200,
  blinkMaxMs: 6500,
  /** Duration of a single blink. */
  blinkDurationMs: 140,
};

/** Scene geometry, shared by the pet, the keyboard and the effects layer. */
export const SCENE = {
  width: 320,
  height: 260,
  /** Where the character's centre sits inside the scene viewBox. */
  petCenterX: 160,
  petCenterY: 118,
};
