import {
  ComposedChart,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { GpxPoint } from "@/lib/gpx";

interface Props {
  points: GpxPoint[];
}

function haversine(a: GpxPoint, b: GpxPoint): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// Color based on slope %
function slopeColor(slope: number): string {
  if (slope > 10)  return "#ef4444"; // steep up
  if (slope > 5)   return "#f97316"; // moderate up
  if (slope > 2)   return "#facc15"; // mild up
  if (slope >= -2) return "#86efac"; // flat
  if (slope >= -5) return "#60a5fa"; // mild down
  if (slope >= -10)return "#818cf8"; // moderate down
  return "#a855f7";                  // steep down
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const ele = payload.find((p) => p.dataKey === "ele")?.value;
  const slope = payload.find((p) => p.dataKey === "slope")?.value;
  return (
    <div style={{
      fontSize: 12,
      borderRadius: 14,
      border: "1px solid rgba(255, 255, 255, 0.35)",
      background: "rgba(255, 255, 255, 0.55)",
      backdropFilter: "blur(16px) saturate(180%)",
      WebkitBackdropFilter: "blur(16px) saturate(180%)",
      color: "#111",
      boxShadow: "0 4px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
      padding: "10px 14px",
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label} km</p>
      {ele !== undefined && <p>Elevation: <b>{ele} m</b></p>}
      {slope !== undefined && (
        <p>Slope: <b style={{ color: slopeColor(slope) }}>{slope > 0 ? "+" : ""}{slope}%</b></p>
      )}
    </div>
  );
}

export function ElevationChart({ points }: Props) {
  // Subsample to max 300 points for performance
  const step = Math.max(1, Math.floor(points.length / 300));
  const sampled = points.filter((_, i) => i % step === 0);

  let cumDist = 0;
  const data = sampled.map((pt, i) => {
    let segDist = 0;
    if (i > 0) {
      segDist = haversine(sampled[i - 1], pt);
      cumDist += segDist / 1000;
    }
    // Slope % = elevation change / horizontal distance * 100
    const eleDiff = i > 0 ? pt.ele - sampled[i - 1].ele : 0;
    const slope = segDist > 0 ? parseFloat(((eleDiff / segDist) * 100).toFixed(1)) : 0;
    // Clamp to ±30% to avoid outliers from GPS noise
    const clampedSlope = Math.max(-30, Math.min(30, slope));
    return {
      dist: parseFloat(cumDist.toFixed(2)),
      ele: Math.round(pt.ele),
      slope: clampedSlope,
    };
  });

  const minEle = Math.min(...data.map((d) => d.ele));
  const maxEle = Math.max(...data.map((d) => d.ele));
  const padding = Math.max(20, Math.round((maxEle - minEle) * 0.15));

  const maxSlope = Math.max(...data.map((d) => Math.abs(d.slope)));
  const slopeDomain = Math.max(15, Math.ceil(maxSlope / 5) * 5);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Elevation profile &amp; slope
        </p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-primary/60" /> Elevation</span>
          <span className="flex items-center gap-1"><span className="inline-block h-2 w-3 rounded-sm bg-amber-400" /> Slope %</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="eleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="dist"
            tickFormatter={(v) => `${v} km`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          {/* Left Y: elevation */}
          <YAxis
            yAxisId="ele"
            domain={[minEle - padding, maxEle + padding]}
            tickFormatter={(v) => `${v} m`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={52}
          />
          {/* Right Y: slope */}
          <YAxis
            yAxisId="slope"
            orientation="right"
            domain={[-slopeDomain, slopeDomain]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            width={36}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Slope bars behind elevation area */}
          <Bar
            yAxisId="slope"
            dataKey="slope"
            isAnimationActive={false}
            maxBarSize={6}
            fill="#f59e0b"
            opacity={0.6}
          />
          <Area
            yAxisId="ele"
            type="monotone"
            dataKey="ele"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            fill="url(#eleGrad)"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
