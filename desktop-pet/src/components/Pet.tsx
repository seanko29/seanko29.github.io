import type { ReactNode } from "react";
import type { EyeStyle, MouthStyle, Pose } from "../animation/types";
import { SCENE } from "../behavior/config";
import { BACK_Y } from "./Keyboard";

/**
 * The character, drawn as rigged vector art.
 *
 * Everything is built from a handful of parts (ears, body, legs, arms, face)
 * that a `Pose` moves around, so new animations are written as numbers in
 * animationConfig.ts instead of as new drawings.
 *
 * Local coordinates put the character's centre at (0, 0); the body spans about
 * x -52..52 and y -62..54, and the paws rest near y 47 where the keyboard is.
 */

const INK = "#4B3A2B";
const FUR = "#FFFFFF";
const FUR_SHADE = "#F2EBE1";
const EYE = "#3A2C1E";
const BLUSH = "#F79FB2";

/** Arm rig constants — see the comment on `armTransform`. */
const SHOULDER_X = 58;
const SHOULDER_Y = 14;
const ARM_REST_TILT = 14;
const ARM_ROT_K = 0.8;
/** Shoulder-to-paw distance; the paw pad is drawn at this point too. */
const ARM_REACH = 40;
const ARM_LIFT_K = 0.5;

/**
 * Turns an arm's pose value into a transform.
 *
 * A pose value of 0 rests the paw on the keyboard; negative values lift it.
 * The lift is mostly vertical (so a key tap reads as a tap) with a little
 * outward swing mixed in, which is what makes big values look like raised arms.
 */
function armTransform(value: number, side: "left" | "right"): string {
  const lift = Math.max(0, -value) * ARM_LIFT_K;
  const rest = side === "left" ? -ARM_REST_TILT : ARM_REST_TILT;
  const swing = side === "left" ? -value * ARM_ROT_K : value * ARM_ROT_K;
  const x = side === "left" ? -SHOULDER_X : SHOULDER_X;
  return `translate(${x} ${SHOULDER_Y - lift}) rotate(${rest + swing})`;
}

/**
 * Where a paw ends up in scene coordinates, used to work out which keys it is
 * resting on. Body rotation and squash are small enough to ignore here.
 */
export function pawScenePosition(pose: Pose, side: "left" | "right"): { x: number; y: number } {
  const value = side === "left" ? pose.leftArm : pose.rightArm;
  const lift = Math.max(0, -value) * ARM_LIFT_K;
  const rest = side === "left" ? -ARM_REST_TILT : ARM_REST_TILT;
  const swing = side === "left" ? -value * ARM_ROT_K : value * ARM_ROT_K;
  const angle = ((rest + swing) * Math.PI) / 180;
  const shoulderX = side === "left" ? -SHOULDER_X : SHOULDER_X;
  const reach = ARM_REACH;

  return {
    x: SCENE.petCenterX + pose.bodyX + shoulderX + reach * -Math.sin(angle),
    y: SCENE.petCenterY + pose.bodyY + (SHOULDER_Y - lift) + reach * Math.cos(angle),
  };
}

function Ear({ side, tilt }: { side: "left" | "right"; tilt: number }) {
  const flip = side === "left" ? 1 : -1;
  return (
    <g transform={`translate(${-34 * flip} ${-46}) rotate(${tilt * flip})`}>
      <path
        d="M -12 8 C -20 -12 -13 -30 0 -30 C 13 -30 20 -12 12 8 Z"
        fill={FUR}
        stroke={INK}
        strokeWidth={5}
        strokeLinejoin="round"
      />
    </g>
  );
}

function Eyes({ style, open, look }: { style: EyeStyle; open: number; look: { x: number; y: number } }) {
  const positions = [-19, 19];
  const y = -17;
  const dx = look.x * 3.6;
  const dy = look.y * 2.8;

  // A blink overrides the eye style: below this the lids are basically shut.
  const shut = open < 0.18 || style === "happy";

  return (
    <g>
      {positions.map((x, i) => {
        if (shut) {
          // A closed eye is a soft upward arc — the classic content expression.
          return (
            <path
              key={i}
              d={`M ${x - 7.5} ${y + 2} Q ${x} ${y - 6.5} ${x + 7.5} ${y + 2}`}
              fill="none"
              stroke={EYE}
              strokeWidth={3.4}
              strokeLinecap="round"
            />
          );
        }

        if (style === "sparkle") {
          return (
            <g key={i} transform={`translate(${x + dx} ${y + dy})`}>
              <path
                d="M 0 -10 Q 1.8 -1.8 9 0 Q 1.8 1.8 0 10 Q -1.8 1.8 -9 0 Q -1.8 -1.8 0 -10 Z"
                fill={EYE}
              />
              <circle cx={-2.4} cy={-2.4} r={1.7} fill="#FFFFFF" />
            </g>
          );
        }

        const wide = style === "wide";
        const rx = wide ? 7.6 : 6.4;
        const ry = (wide ? 10.2 : 8.6) * Math.max(0.18, open);

        return (
          <g key={i}>
            <ellipse cx={x + dx} cy={y + dy} rx={rx} ry={ry} fill={EYE} />
            <circle cx={x + dx - rx * 0.36} cy={y + dy - ry * 0.4} r={wide ? 2.4 : 1.9} fill="#FFFFFF" />
            {style === "worried" && (
              <path
                d={`M ${x - 9 * (i === 0 ? 1 : -1)} ${y - 14} L ${x + 5 * (i === 0 ? 1 : -1)} ${y - 10.5}`}
                stroke={EYE}
                strokeWidth={2.6}
                strokeLinecap="round"
                fill="none"
              />
            )}
          </g>
        );
      })}
    </g>
  );
}

function Mouth({ style }: { style: MouthStyle }) {
  const y = -1;
  const stroke = {
    fill: "none",
    stroke: EYE,
    strokeWidth: 2.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (style) {
    case "smile":
      return <path d={`M -8 ${y - 1} Q 0 ${y + 7.5} 8 ${y - 1}`} {...stroke} />;
    case "open":
      return (
        <g>
          <ellipse cx={0} cy={y + 2} rx={5.4} ry={6.6} fill={EYE} />
          <ellipse cx={0} cy={y + 4.6} rx={2.8} ry={2.6} fill="#E98598" />
        </g>
      );
    case "small":
      return <path d={`M -3.6 ${y} Q 0 ${y + 3.6} 3.6 ${y}`} {...stroke} />;
    case "wobble":
      return (
        <path
          d={`M -7 ${y + 1} Q -5 ${y - 2.4} -3 ${y + 1} Q -1 ${y + 4} 1 ${y + 1} Q 3 ${y - 2.4} 5 ${y + 1}`}
          {...stroke}
        />
      );
    case "flat":
      return <path d={`M -5 ${y + 1} L 5 ${y + 1}`} {...stroke} />;
    case "w":
    default:
      // The signature ω mouth.
      return <path d={`M -7.5 ${y - 1} Q -4 ${y + 5} 0 ${y + 0.6} Q 4 ${y + 5} 7.5 ${y - 1}`} {...stroke} />;
  }
}

function Blush({ opacity }: { opacity: number }) {
  return (
    <g opacity={opacity}>
      {[-34, 34].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy={-3} rx={12.5} ry={7.6} fill={BLUSH} />
          {[-6, -1.5, 3, 7.5].map((offset) => (
            <path
              key={offset}
              d={`M ${x + offset - 2.6} ${1.4} L ${x + offset + 2.6} ${-6.2}`}
              stroke="#FFFFFF"
              strokeWidth={1.7}
              strokeLinecap="round"
              opacity={0.9}
            />
          ))}
        </g>
      ))}
    </g>
  );
}

function Arm({ value, side }: { value: number; side: "left" | "right" }) {
  return (
    <g transform={armTransform(value, side)}>
      <rect x={-10.5} y={-8} width={21} height={56} rx={10.5} fill={FUR} stroke={INK} strokeWidth={5} />
      {/* The paw pad, so the end of the arm reads as a hand on the keys. */}
      <ellipse cx={0} cy={ARM_REACH} rx={6.2} ry={5} fill={FUR_SHADE} opacity={0.85} />
    </g>
  );
}

export interface PetProps {
  pose: Pose;
  /** Where to point the eyes, as -1..1 on each axis. */
  look: { x: number; y: number };
  /** Drawn between the body and the arms, so the paws land on top of it. */
  keyboard?: ReactNode;
}

export function Pet({ pose, look, keyboard }: PetProps) {
  // Squash and stretch pivots at the feet so the character never floats.
  const root = [
    `translate(${SCENE.petCenterX + pose.bodyX} ${SCENE.petCenterY + pose.bodyY})`,
    `rotate(${pose.bodyRot})`,
    `translate(0 68)`,
    `scale(${pose.squash} ${1 / pose.squash})`,
    `translate(0 -68)`,
  ].join(" ");

  const headTilt = `rotate(${pose.headTilt} 0 40)`;
  const arms = (
    <>
      <Arm value={pose.leftArm} side="left" />
      <Arm value={pose.rightArm} side="right" />
    </>
  );

  /*
   * The arms are drawn twice. The first pass goes behind the body, which hides
   * the shoulder joint so the arms look attached rather than stuck on. The
   * second pass repeats them clipped to the keyboard area, which puts the paws
   * back on top of the keys.
   */
  return (
    <>
      <defs>
        <clipPath id="pet-paws-clip" clipPathUnits="userSpaceOnUse">
          <rect x={0} y={BACK_Y} width={SCENE.width} height={SCENE.height - BACK_Y} />
        </clipPath>
      </defs>

      <g transform={root}>
        <g transform={headTilt}>
          <Ear side="left" tilt={pose.earTilt} />
          <Ear side="right" tilt={pose.earTilt} />

          {/* Legs sit behind the body so only the stubs show. */}
          <rect x={-38} y={34} width={22} height={34} rx={11} fill={FUR} stroke={INK} strokeWidth={5} />
          <rect x={16} y={34} width={22} height={34} rx={11} fill={FUR} stroke={INK} strokeWidth={5} />
        </g>

        {arms}

        <g transform={headTilt}>
          {/* Body — one rounded blob, the way the character is actually drawn. */}
          <path
            d="M -52 -10 C -52 -46 -32 -62 0 -62 C 32 -62 52 -46 52 -10 C 52 26 46 54 0 54 C -46 54 -52 26 -52 -10 Z"
            fill={FUR}
            stroke={INK}
            strokeWidth={5}
            strokeLinejoin="round"
          />

          <Blush opacity={pose.blush} />
          <Eyes style={pose.eyes} open={pose.eyeOpen} look={look} />
          <Mouth style={pose.mouth} />
        </g>
      </g>

      {/* The keyboard sits in scene space: the pet bobs, the desk does not. */}
      {keyboard}

      <g clipPath="url(#pet-paws-clip)">
        <g transform={root}>{arms}</g>
      </g>
    </>
  );
}
