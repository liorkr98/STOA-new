import { cn } from "@/lib/design/cn";

/**
 * Minimal price sparkline. Pure SVG, no library. Stroke uses sentiment color
 * based on net direction (the only allowed use of up/down here).
 */
export function Sparkline({
  data,
  width = 120,
  height = 32,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (data.length < 2) return <svg width={width} height={height} className={className} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const stepX = width / (data.length - 1);
  const points = data.map((d, i) => {
    const x = i * stepX;
    const y = height - ((d - min) / span) * (height - 2) - 1;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const up = data[data.length - 1] >= data[0];
  const stroke = up ? "var(--up)" : "var(--down)";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
