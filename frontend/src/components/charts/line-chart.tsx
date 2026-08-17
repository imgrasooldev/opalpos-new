/**
 * Sales trend — ek hi series ka area + line chart.
 *
 * Ek series hai is liye legend nahi (card ka title hi usay naam deta hai);
 * grid halki rakhi hai taake line aage rahe, aur x-axis par har point ka label
 * nahi — sirf `tickEvery` ke hisab se.
 */

import { cn } from "@/lib/cn";

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 8, bottom: 26, left: 36 };

export type Point = { label: string; value: number };

function smoothPath(points: Array<{ x: number; y: number }>): string {
  return points.reduce((path, point, i) => {
    if (i === 0) return `M ${point.x} ${point.y}`;
    const prev = points[i - 1];
    const half = (point.x - prev.x) / 2;
    return `${path} C ${prev.x + half} ${prev.y}, ${point.x - half} ${point.y}, ${point.x} ${point.y}`;
  }, "");
}

type Props = {
  points: Point[];
  /** Y-axis ke steps — sab se upar wala hi scale ka max hai. */
  ticks: number[];
  formatTick: (value: number) => string;
  /** Har kitne point par x-label dikhana hai. */
  tickEvery?: number;
  /** SVG gradient ids global hote hain — ek page par do chart ho to badal do. */
  id?: string;
  className?: string;
};

export function LineChart({
  points,
  ticks,
  formatTick,
  tickEvery = 2,
  id = "trend",
  className,
}: Props) {
  const max = Math.max(...ticks);
  const plotWidth = WIDTH - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const coords = points.map((point, i) => ({
    ...point,
    x: PAD.left + (i / (points.length - 1)) * plotWidth,
    y: PAD.top + plotHeight - (point.value / max) * plotHeight,
  }));

  const line = smoothPath(coords);
  const baseline = PAD.top + plotHeight;
  const area = `${line} L ${coords[coords.length - 1].x} ${baseline} L ${coords[0].x} ${baseline} Z`;

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className={cn("h-56 w-full", className)}
      role="img"
      aria-label="Sales over the last 30 days"
    >
      <defs>
        <linearGradient id={`${id}-area`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* grid + y labels */}
      {ticks.map((tick) => {
        const y = PAD.top + plotHeight - (tick / max) * plotHeight;
        return (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={WIDTH - PAD.right}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeWidth="1"
              strokeDasharray={tick === 0 ? undefined : "4 4"}
            />
            <text
              x={PAD.left - 8}
              y={y + 3.5}
              textAnchor="end"
              className="fill-current text-[10px] opacity-45"
            >
              {formatTick(tick)}
            </text>
          </g>
        );
      })}

      <path d={area} fill={`url(#${id}-area)`} />
      <path
        d={line}
        fill="none"
        stroke="var(--color-brand-500)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* har point par marker — surface ring taake line par saaf baithe */}
      {coords.map((point) => (
        <circle
          key={point.label}
          cx={point.x}
          cy={point.y}
          r="3.5"
          fill="var(--color-brand-500)"
          stroke="var(--color-background)"
          strokeWidth="2"
        />
      ))}

      {/* x labels */}
      {/* sirf `tickEvery` par — aakhri point ko zabardasti label dene se wo
          pichle label se takra jata tha */}
      {coords.map((point, i) =>
        i % tickEvery === 0 ? (
          <text
            key={point.label}
            x={point.x}
            y={HEIGHT - 8}
            textAnchor="middle"
            className="fill-current text-[10px] opacity-45"
          >
            {point.label}
          </text>
        ) : null,
      )}
    </svg>
  );
}
