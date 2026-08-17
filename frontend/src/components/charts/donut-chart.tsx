/**
 * Part-to-whole donut.
 *
 * Har segment ke darmiyan 2px ka surface gap hai taake rang aapas mein na
 * chipken. Identity sirf rang par nahi chhori — saath wali legend har segment
 * ka naam, value aur share likhti hai.
 */

import { cn } from "@/lib/cn";

const SIZE = 160;
const RADIUS = 62;
const STROKE = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
/** Segments ke beech ka faasla, arc length mein. */
const GAP = 3;

export type Segment = {
  label: string;
  value: number;
  color: string;
};

type Props = {
  segments: Segment[];
  /** Beech mein — bara number aur uske neeche chhota label. */
  centerValue: string;
  centerLabel: string;
  className?: string;
};

export function DonutChart({
  segments,
  centerValue,
  centerLabel,
  className,
}: Props) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  // har segment ki arc length + us se pehle wale segments ka jorh (offset)
  const arcs = segments.reduce<
    Array<Segment & { length: number; offset: number }>
  >((acc, segment) => {
    const previous = acc[acc.length - 1];
    return [
      ...acc,
      {
        ...segment,
        length: (segment.value / total) * CIRCUMFERENCE,
        offset: previous ? previous.offset + previous.length : 0,
      },
    ];
  }, []);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-40 w-40"
        role="img"
        aria-label={`Revenue breakdown: ${segments
          .map((s) => `${s.label} ${Math.round((s.value / total) * 100)}%`)
          .join(", ")}`}
      >
        <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
          {arcs.map((arc) => {
            const dash = Math.max(arc.length - GAP, 1);
            return (
              <circle
                key={arc.label}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={arc.color}
                strokeWidth={STROKE}
                strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                strokeDashoffset={-arc.offset}
                strokeLinecap="butt"
              />
            );
          })}
        </g>
      </svg>

      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-semibold tabular-nums">{centerValue}</span>
        <span className="text-[11px] text-muted">{centerLabel}</span>
      </div>
    </div>
  );
}
