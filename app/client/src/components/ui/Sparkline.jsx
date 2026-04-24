/**
 * Compact inline SVG sparkline (no deps).
 */
export default function Sparkline({
  data = [],
  width = 160,
  height = 36,
  stroke = "#6366f1",
  fill = "rgba(99, 102, 241, 0.12)",
  strokeWidth = 1.75,
}) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const w = width;
  const h = height;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = w / Math.max(1, data.length - 1);
  const points = data.map((v, i) => [i * step, h - ((v - min) / range) * (h - 4) - 2]);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} role="img" aria-hidden>
      <path d={area} fill={fill} stroke="none" />
      <path d={path} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function BarChartMini({ data = [], width = 200, height = 80, accessor = (d) => d.count, labelKey = "label" }) {
  if (!Array.isArray(data) || data.length === 0) return null;
  const max = Math.max(...data.map(accessor), 1);
  const barW = width / data.length - 4;
  return (
    <svg width={width} height={height} role="img" aria-hidden>
      {data.map((d, i) => {
        const v = accessor(d);
        const h = Math.max(2, (v / max) * (height - 4));
        const x = i * (barW + 4);
        const y = height - h;
        return (
          <g key={d[labelKey] || i}>
            <rect x={x} y={y} width={barW} height={h} rx="2" fill="#6366f1" opacity={0.85} />
          </g>
        );
      })}
    </svg>
  );
}
