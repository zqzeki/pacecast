import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  CartesianGrid,
} from "recharts";

interface Props {
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  userPace: number; // predicted pace in min/km
  ageLabel: string;
  gender: string;
}

export function PaceDistributionChart({ p10, p25, p50, p75, p90, userPace, ageLabel, gender }: Props) {
  // Show pace bands as a horizontal distribution
  const bands = [
    { label: "Elite\n(<p10)",    from: p10 - 1.5, to: p10,  pct: "Top 10%",  color: "#059669" },
    { label: "Fast\n(p10–p25)",  from: p10,        to: p25,  pct: "10–25%",   color: "#34d399" },
    { label: "Above avg\n(p25–p50)", from: p25,    to: p50,  pct: "25–50%",   color: "#a7f3d0" },
    { label: "Below avg\n(p50–p75)", from: p50,    to: p75,  pct: "50–75%",   color: "#fde68a" },
    { label: "Slow\n(p75–p90)", from: p75,         to: p90,  pct: "75–90%",   color: "#f59e0b" },
    { label: "Back\n(>p90)",    from: p90,         to: p90 + 1.5, pct: "Bottom 10%", color: "#d97706" },
  ];

  const data = bands.map((b) => ({
    label: b.label,
    width: parseFloat((b.to - b.from).toFixed(3)),
    from: b.from,
    pct: b.pct,
    color: b.color,
  }));

  const allMin = bands[0].from;
  const allMax = bands[bands.length - 1].to;

  // Simple horizontal range chart using recharts BarChart in layout="vertical"
  const chartData = bands.map((b) => ({
    name: b.pct,
    start: parseFloat((b.from - allMin).toFixed(3)),
    width: parseFloat((b.to - b.from).toFixed(3)),
    color: b.color,
    from: b.from,
    to: b.to,
  }));

  const userOffset = parseFloat((userPace - allMin).toFixed(3));

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
        Pace distribution — {ageLabel}, {gender}
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Where your predicted pace sits among WMM athletes (min/km, lower = faster)
      </p>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          layout="vertical"
          data={chartData}
          margin={{ top: 4, right: 12, bottom: 4, left: 56 }}
          barCategoryGap={6}
        >
          <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            type="number"
            domain={[0, allMax - allMin]}
            tickFormatter={(v) => `${(v + allMin).toFixed(1)}`}
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
            label={{ value: "min/km", position: "insideBottomRight", offset: -4, fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(_: unknown, __: unknown, props: { payload?: { from?: number; to?: number } }) => {
              const { from, to } = props.payload ?? {};
              return [`${from?.toFixed(2)}–${to?.toFixed(2)} min/km`, "Pace range"];
            }}
            contentStyle={{
              fontSize: 12,
              borderRadius: 14,
              border: "1px solid rgba(255, 255, 255, 0.35)",
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(16px) saturate(180%)",
              WebkitBackdropFilter: "blur(16px) saturate(180%)",
              color: "#111",
              boxShadow: "0 4px 24px rgba(0,0,0,0.10), inset 0 1px 0 rgba(255,255,255,0.6)",
              padding: "10px 14px",
            }}
          />
          {/* Invisible base bar to offset the visible bar */}
          <Bar dataKey="start" stackId="a" fill="transparent" isAnimationActive={false} />
          <Bar dataKey="width" stackId="a" isAnimationActive={false} radius={[0, 4, 4, 0]}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
          {/* User's pace reference line */}
          <ReferenceLine
            x={userOffset}
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="4 2"
            label={{ value: `You: ${userPace.toFixed(2)}`, position: "top", fontSize: 10, fill: "hsl(var(--primary))", fontWeight: 600 }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
