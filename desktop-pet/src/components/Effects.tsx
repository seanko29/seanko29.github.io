/**
 * Overlay effects: the Zzz while sleeping, and the little burst of hearts,
 * sparkles or sweat that a click reaction throws off.
 *
 * Bursts are keyed by an incrementing id so React remounts them, which is what
 * restarts the CSS animation on every click.
 */

export type BurstKind = "hearts" | "sparkles" | "sweat";

export interface Burst {
  id: number;
  kind: BurstKind;
}

const HEART =
  "M 0 3.6 C -7.2 -1.2 -9 -4.8 -7.2 -8.4 C -5.4 -12 -1.2 -10.8 0 -7.2 C 1.2 -10.8 5.4 -12 7.2 -8.4 C 9 -4.8 7.2 -1.2 0 3.6 Z";
const STAR = "M 0 -8 Q 1.6 -1.6 8 0 Q 1.6 1.6 0 8 Q -1.6 1.6 -8 0 Q -1.6 -1.6 0 -8 Z";
const DROP = "M 0 -7 C 4 -2 5 1 2.6 3.2 C 0.6 5 -2.4 4.4 -3.4 2.2 C -4.4 0 -2.6 -3.4 0 -7 Z";

const BURST_SPOTS = [
  { x: 118, y: 62, delay: 0, scale: 1 },
  { x: 202, y: 56, delay: 0.12, scale: 0.8 },
  { x: 146, y: 44, delay: 0.24, scale: 0.65 },
  { x: 186, y: 74, delay: 0.34, scale: 0.9 },
  { x: 164, y: 38, delay: 0.46, scale: 0.7 },
];

function Sleep() {
  return (
    <g>
      {[
        { x: 218, y: 66, size: 17, delay: 0 },
        { x: 234, y: 48, size: 12, delay: 0.7 },
        { x: 246, y: 34, size: 9, delay: 1.4 },
      ].map((z) => (
        <g key={z.delay} transform={`translate(${z.x} ${z.y})`}>
          <text className="fx-zzz" fontSize={z.size} style={{ animationDelay: `${z.delay}s` }}>
            Z
          </text>
        </g>
      ))}
    </g>
  );
}

export function Effects({ sleeping, burst }: { sleeping: boolean; burst: Burst | null }) {
  return (
    <g pointerEvents="none">
      {sleeping && <Sleep />}
      {burst && (
        <g key={burst.id}>
          {BURST_SPOTS.slice(0, burst.kind === "sweat" ? 2 : 5).map((spot, i) => (
            /*
             * Two groups on purpose: a CSS `transform` in the keyframes replaces
             * the SVG transform attribute outright, so placing and animating on
             * the same element would fling every effect to the origin.
             */
            <g key={i} transform={`translate(${spot.x} ${spot.y}) scale(${spot.scale})`}>
              <g
                className={burst.kind === "sparkles" ? "fx-pop" : "fx-float"}
                style={{ animationDelay: `${spot.delay}s` }}
              >
                {burst.kind === "hearts" && <path d={HEART} fill="#FF7FA3" />}
                {burst.kind === "sparkles" && <path d={STAR} fill="#FFD264" />}
                {burst.kind === "sweat" && <path d={DROP} fill="#9BD2F5" stroke="#6FB4DE" strokeWidth={1.2} />}
              </g>
            </g>
          ))}
        </g>
      )}
    </g>
  );
}
