import { useMemo } from 'react';
import { CHART_COLORS } from '../types';

interface DataPoint { date: string; label: string; values: Record<string, number | null>; }

interface SimpleChartProps {
  data: DataPoint[];
  unitNames: { id: string; name: string }[];
  height?: number;
}

export function SimpleChart({ data, unitNames, height = 200 }: SimpleChartProps) {
  const { paths, yLabels, yMin, yMax, xLabels } = useMemo(() => {
    const allVals = data.flatMap(d => Object.values(d.values).filter((v): v is number => v !== null));
    if (allVals.length === 0) return { paths: [], yLabels: [], yMin: 0, yMax: 10, xLabels: [] };

    const rawMin = Math.min(...allVals);
    const rawMax = Math.max(...allVals);
    const padding = Math.max((rawMax - rawMin) * 0.2, 2);
    const yMin = Math.floor(rawMin - padding);
    const yMax = Math.ceil(rawMax + padding);
    const yRange = yMax - yMin || 1;

    const w = 100;
    const h = 100;
    const px = 0;
    const py = 5;

    const yLabels: number[] = [];
    const step = yRange <= 10 ? 1 : yRange <= 20 ? 2 : 5;
    for (let v = Math.ceil(yMin / step) * step; v <= yMax; v += step) yLabels.push(v);

    const xLabels = data.map((d, i) => ({ label: d.label, x: px + (i / Math.max(data.length - 1, 1)) * (w - 2 * px) }));

    const paths = unitNames.map((unit, ui) => {
      const points: { x: number; y: number; val: number }[] = [];
      data.forEach((d, i) => {
        const v = d.values[unit.id];
        if (v !== null && v !== undefined) {
          points.push({
            x: px + (i / Math.max(data.length - 1, 1)) * (w - 2 * px),
            y: py + (1 - (v - yMin) / yRange) * (h - 2 * py),
            val: v,
          });
        }
      });
      const pathStr = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      return { id: unit.id, name: unit.name, color: CHART_COLORS[ui % CHART_COLORS.length], pathStr, points };
    });

    return { paths, yLabels, yMin, yMax, xLabels };
  }, [data, unitNames]);

  if (data.length === 0) return <div className="p-6 text-center text-sm tc-muted">No data for this period</div>;

  const yRange = yMax - yMin || 1;

  return (
    <div>
      <svg viewBox="-12 -2 124 114" width="100%" height={height} preserveAspectRatio="xMidYMid meet">
        {yLabels.map(v => {
          const y = 5 + (1 - (v - yMin) / yRange) * 90;
          return (
            <g key={v}>
              <line x1="0" y1={y} x2="100" y2={y} stroke="var(--chart-grid)" strokeWidth="0.3" />
              <text x="-2" y={y + 1} textAnchor="end" fontSize="3.5" fill="var(--chart-label)">{v}°</text>
            </g>
          );
        })}
        {xLabels.map((l, i) => (
          <text key={i} x={l.x} y="108" textAnchor="middle" fontSize="3" fill="var(--chart-label)">{l.label}</text>
        ))}
        {paths.map(p => (
          <g key={p.id}>
            {p.pathStr && <path d={p.pathStr} fill="none" stroke={p.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />}
            {p.points.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="1.5" fill={p.color} opacity="0.9">
                <title>{p.name}: {pt.val}°C</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {paths.map(p => (
          <div key={p.id} className="flex items-center gap-1.5 text-xs font-semibold tc-secondary">
            <div className="w-3 h-1.5 rounded-full" style={{ background: p.color }} />
            {p.name}
          </div>
        ))}
      </div>
    </div>
  );
}
