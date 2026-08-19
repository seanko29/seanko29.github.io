/**
 * The keyboard the pet types on.
 *
 * It is a separate layer from the character (rather than being baked into the
 * typing artwork) so keys can react individually, the pet can bob without the
 * desk bobbing with it, and the keyboard can be re-skinned later.
 */

const INK = "#4B3A2B";
const CASE = "#FBF7F0";
const CASE_SIDE = "#E7DED0";
const KEY = "#FFFFFF";
const KEY_SIDE = "#DCD2C2";
const KEY_ACTIVE = "#FFD9A8";

/** Back and front edges of the case, in scene coordinates. */
export const BACK_Y = 152;
const FRONT_Y = 198;
const BACK_HALF = 108;
const FRONT_HALF = 122;
const CENTER_X = 160;

/** Row layouts as relative key widths; the wide entry on the last row is the space bar. */
const ROWS: number[][] = [
  Array(14).fill(1),
  Array(14).fill(1),
  Array(13).fill(1),
  [1.4, 1.2, 1.2, 5.5, 1.2, 1.2, 1.4],
];

const ROW_T = [0.07, 0.3, 0.53, 0.78];
const KEY_H = 8.6;
const GAP = 1.6;
const MARGIN = 7;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface KeyRect {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Precomputed geometry, also used to decide which keys a paw is over. */
export const KEYS: KeyRect[] = ROWS.flatMap((weights, row) => {
  const t = ROW_T[row];
  const half = lerp(BACK_HALF, FRONT_HALF, t);
  const y = lerp(BACK_Y, FRONT_Y, t) + 3;
  const usable = half * 2 - MARGIN * 2 - GAP * (weights.length - 1);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);

  let cursor = CENTER_X - half + MARGIN;
  return weights.map((weight, col) => {
    const width = (usable * weight) / totalWeight;
    const rect: KeyRect = { id: `${row}-${col}`, x: cursor, y, width, height: KEY_H };
    cursor += width + GAP;
    return rect;
  });
});

export interface KeyboardProps {
  /** Ids of keys currently held down. */
  pressed: ReadonlySet<string>;
  /** Cools the case down while the pet is asleep. Painted as an overlay rather
   *  than as group opacity, which would make the pet show through the desk. */
  dimmed?: boolean;
}

export function Keyboard({ pressed, dimmed = false }: KeyboardProps) {
  return (
    <g>
      {/* Front lip, giving the case a little thickness. */}
      <path
        d={`M ${CENTER_X - FRONT_HALF} ${FRONT_Y - 6}
            L ${CENTER_X + FRONT_HALF} ${FRONT_Y - 6}
            L ${CENTER_X + FRONT_HALF - 3} ${FRONT_Y + 4}
            L ${CENTER_X - FRONT_HALF + 3} ${FRONT_Y + 4} Z`}
        fill={CASE_SIDE}
        stroke={INK}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Top surface, drawn in perspective. */}
      <path
        d={`M ${CENTER_X - BACK_HALF} ${BACK_Y}
            L ${CENTER_X + BACK_HALF} ${BACK_Y}
            L ${CENTER_X + FRONT_HALF} ${FRONT_Y}
            L ${CENTER_X - FRONT_HALF} ${FRONT_Y} Z`}
        fill={CASE}
        stroke={INK}
        strokeWidth={4.5}
        strokeLinejoin="round"
      />

      {KEYS.map((key) => {
        const down = pressed.has(key.id);
        return (
          <g key={key.id} transform={down ? "translate(0 1.6)" : undefined}>
            {!down && (
              <rect
                x={key.x}
                y={key.y + 1.8}
                width={key.width}
                height={key.height}
                rx={2.2}
                fill={KEY_SIDE}
              />
            )}
            <rect
              x={key.x}
              y={key.y}
              width={key.width}
              height={key.height}
              rx={2.2}
              fill={down ? KEY_ACTIVE : KEY}
              stroke={INK}
              strokeWidth={1.5}
            />
          </g>
        );
      })}

      {dimmed && (
        <path
          d={`M ${CENTER_X - BACK_HALF} ${BACK_Y}
              L ${CENTER_X + BACK_HALF} ${BACK_Y}
              L ${CENTER_X + FRONT_HALF} ${FRONT_Y + 4}
              L ${CENTER_X - FRONT_HALF} ${FRONT_Y + 4} Z`}
          fill="#5C6B7A"
          opacity={0.16}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
