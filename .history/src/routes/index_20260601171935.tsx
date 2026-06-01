import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Activity, Mountain, Route as RouteIcon, TrendingDown, Loader2 } from "lucide-react";
import { GpxDropzone } from "@/components/GpxDropzone";
import { RouteMap } from "@/components/RouteMap";
import { ElevationChart } from "@/components/ElevationChart";
import { PaceDistributionChart } from "@/components/PaceDistributionChart";
import { parseGpx, type GpxData } from "@/lib/gpx";
import {
  RACE_KM,
  RACE_LABEL,
  detectRaceDistance,
  deriveFactors,
  estimatePercentile,
  formatPace,
  formatTime,
  parseTimeToSeconds,
  predictFinishTime,
  type AgeGroup,
  type Gender,
  type PaceRow,
  type RaceDistance,
} from "@/lib/prediction";
import { getPacePercentiles, type PacePercentiles } from "@/lib/api/pace-fetch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PaceCast — GPX Race Time Predictor" },
      {
        name: "description",
        content:
          "Upload a GPX route and get a personalized race finish-time prediction based on elevation, your previous race, age, and gender.",
      },
      { property: "og:title", content: "PaceCast — GPX Race Time Predictor" },
      {
        property: "og:description",
        content:
          "Upload a GPX route and get a personalized race finish-time prediction.",
      },
    ],
  }),
  component: Index,
});

const RACES: RaceDistance[] = ["5k", "10k", "half", "full"];
const AGE_GROUPS: AgeGroup[] = ["18-34", "35-54", "55+"];
const AGE_LABEL: Record<AgeGroup, string> = {
  "18-34": "18–34",
  "35-54": "35–54",
  "55+":   "55+",
};

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        active
          ? "border-primary bg-primary text-primary-foreground shadow-sm"
          : "border-border bg-card text-foreground hover:border-primary/60 hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

function Index() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [gpx, setGpx] = useState<GpxData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previousRace, setPreviousRace] = useState<RaceDistance>("10k");
  const [previousTime, setPreviousTime] = useState<string>("00:55:00");
  const [age, setAge] = useState<AgeGroup>("18-34");
  const [gender, setGender] = useState<Gender>("male");
  const [predicting, setPredicting] = useState(false);
  const [prediction, setPrediction] = useState<number | null>(null);
  const [allPercentiles, setAllPercentiles] = useState<PacePercentiles[]>([]);
  const [dataYear, setDataYear] = useState<2019 | 2020>(2019);
  const [fetchingData, setFetchingData] = useState(false);

  const handleFile = async (text: string, name: string) => {
    setError(null);
    try {
      const data = parseGpx(text);
      setGpx(data);
      setFileName(name);
    } catch (e) {
      setGpx(null);
      setFileName(null);
      setError(e instanceof Error ? e.message : "Failed to parse GPX");
    }
  };

  const detectedRace = useMemo(
    () => (gpx ? detectRaceDistance(gpx.distanceKm) : null),
    [gpx],
  );

  const previousTimeSec = useMemo(
    () => parseTimeToSeconds(previousTime),
    [previousTime],
  );
  const timeInvalid = previousTime.trim().length > 0 && previousTimeSec === null;

  const inputs = useMemo(() => {
    if (!gpx || !detectedRace || previousTimeSec === null) return null;
    return {
      targetRace: detectedRace,
      routeElevationGain: gpx.elevationGain,
      previousRace,
      previousTimeSec,
      age,
      gender,
    };
  }, [gpx, detectedRace, previousRace, previousTimeSec, age, gender]);

  // Fetch pace percentiles whenever year changes
  useEffect(() => {
    setFetchingData(true);
    getPacePercentiles(dataYear)
      .then((rows) => setAllPercentiles(rows ?? []))
      .catch(() => setAllPercentiles([]))
      .finally(() => setFetchingData(false));
  }, [dataYear]);

  useEffect(() => {
    if (!inputs) {
      setPrediction(null);
      return;
    }
    setPredicting(true);
    const handle = window.setTimeout(() => {
      const factors = allPercentiles.length
        ? deriveFactors(allPercentiles as PaceRow[], inputs.age, inputs.gender)
        : null;
      setPrediction(predictFinishTime(inputs, factors ?? undefined));
      setPredicting(false);
    }, 600);
    return () => window.clearTimeout(handle);
  }, [inputs, allPercentiles]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Activity className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">PaceCast</h1>
            <p className="text-xs text-muted-foreground">
              GPX-powered race finish-time predictor
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {fetchingData && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <label htmlFor="data-year" className="text-xs text-muted-foreground whitespace-nowrap">
              Dataset year
            </label>
            <select
              id="data-year"
              value={dataYear}
              onChange={(e) => setDataYear(Number(e.target.value) as 2019 | 2020)}
              className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={2019}>2019</option>
              <option value={2020}>2020</option>
            </select>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        {/* Section 1: Upload */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            1. Upload your route
          </h2>
          <GpxDropzone onFile={handleFile} fileName={fileName} error={error} />
        </section>

        {/* Section 2: Always visible */}
        <section className="space-y-5 rounded-2xl border border-border bg-card p-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            2. Tell us about your experience
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label
                htmlFor="prev-race"
                className="text-xs font-medium text-muted-foreground"
              >
                Previous race distance
              </label>
              <select
                id="prev-race"
                value={previousRace}
                onChange={(e) => setPreviousRace(e.target.value as RaceDistance)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {RACES.map((r) => (
                  <option key={r} value={r}>
                    {RACE_LABEL[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="prev-time"
                className="text-xs font-medium text-muted-foreground"
              >
                Previous finish time (HH:MM:SS)
              </label>
              <input
                id="prev-time"
                type="text"
                inputMode="numeric"
                placeholder="01:45:00"
                value={previousTime}
                onChange={(e) => setPreviousTime(e.target.value)}
                className={cn(
                  "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-1",
                  timeInvalid
                    ? "border-destructive focus:border-destructive focus:ring-destructive"
                    : "border-border focus:border-primary focus:ring-primary",
                )}
              />
              {timeInvalid && (
                <p className="text-xs text-destructive">
                  Use HH:MM:SS, e.g. 01:45:00
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Age group
            </label>
            <div className="flex flex-wrap gap-2">
              {AGE_GROUPS.map((a) => (
                <Pill key={a} active={age === a} onClick={() => setAge(a)}>
                  {AGE_LABEL[a]}
                </Pill>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Gender
            </label>
            <div className="flex flex-wrap gap-2">
              <Pill active={gender === "male"} onClick={() => setGender("male")}>
                Male
              </Pill>
              <Pill active={gender === "female"} onClick={() => setGender("female")}>
                Female
              </Pill>
            </div>
          </div>

        </section>

        {/* Route stats + map + prediction — shown after GPX upload */}
        {gpx && detectedRace && (
          <>
            <section className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-card p-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Predicted finish time
              </h2>

              {previousTimeSec === null ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  Enter a valid previous finish time above to see your prediction.
                </p>
              ) : predicting || prediction === null ? (
                <div className="mt-4 flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-sm">Crunching the numbers…</span>
                </div>
              ) : (() => {
                const DB_AG: Record<AgeGroup, string> = { "18-34": "18 - 34", "35-54": "35 - 54", "55+": "55 +" };
                const userRow = allPercentiles.find(
                  (r) => r.age_group === DB_AG[age] && r.gender === (gender === "male" ? "M" : "F")
                );
                const spreadFast = userRow ? userRow.p25 / userRow.p50 : 0.95;
                const spreadSlow = userRow ? userRow.p75 / userRow.p50 : 1.05;
                const optimistic   = Math.round(prediction * spreadFast);
                const expected     = Math.round(prediction);
                const conservative = Math.round(prediction * spreadSlow);

                const paceMinkm = prediction / 60 / RACE_KM[detectedRace];
                const pct = userRow ? estimatePercentile(paceMinkm, userRow) : null;

                return (
                  <div className="mt-4 space-y-5">
                    {/* Three scenarios */}
                    <div className="grid grid-cols-3 gap-3">
                      {([
                        { label: "Optimistic",   time: optimistic,   sub: "p25 effort", color: "text-emerald-600" },
                        { label: "Expected",     time: expected,     sub: "your pace",  color: "text-foreground" },
                        { label: "Conservative", time: conservative, sub: "p75 effort", color: "text-amber-600" },
                      ] as const).map(({ label, time, sub, color }) => {
                        const pace = time / 60 / RACE_KM[detectedRace];
                        return (
                          <div key={label} className={`rounded-xl border ${label === "Expected" ? "border-primary bg-primary/5" : "border-border bg-card"} p-4 text-center`}>
                            <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                            <p className={`text-2xl font-semibold tabular-nums ${color}`}>{formatTime(time)}</p>
                            <p className={`text-xs tabular-nums font-medium mt-0.5 ${color}`}>{formatPace(pace)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{sub}</p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Percentile bar */}
                    {pct !== null && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-sm font-medium text-foreground tabular-nums whitespace-nowrap">
                            Faster than {pct}% of WMM runners
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">Based on {AGE_LABEL[age]}, {gender} athletes in the World Marathon Majors dataset.</p>
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
                      Expected uses the Riegel formula scaled to your route distance and elevation. Optimistic / Conservative reflect the p25–p75 pace spread of similar athletes in your demographic.
                    </p>
                  </div>
                );
              })()}
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Route stats
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Stat
                  icon={RouteIcon}
                  label="Distance"
                  value={`${gpx.distanceKm.toFixed(2)} km`}
                />
                <Stat
                  icon={Mountain}
                  label="Elevation gain"
                  value={`${Math.round(gpx.elevationGain)} m`}
                />
                <Stat
                  icon={TrendingDown}
                  label="Elevation loss"
                  value={`${Math.round(gpx.elevationLoss)} m`}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Detected race:{" "}
                <span className="font-medium text-foreground">
                  {RACE_LABEL[detectedRace]} ({RACE_KM[detectedRace]} km)
                </span>{" "}
                — automatically matched from your route length.
              </p>
            </section>

            <ElevationChart points={gpx.points} />

            {(() => {
              const DB_AG: Record<AgeGroup, string> = { "18-34": "18 - 34", "35-54": "35 - 54", "55+": "55 +" };
              const userRow = allPercentiles.find(
                (r) => r.age_group === DB_AG[age] && r.gender === (gender === "male" ? "M" : "F")
              );
              if (!userRow || !prediction) return null;
              const paceMinkm = prediction / 60 / RACE_KM[detectedRace];
              return (
                <PaceDistributionChart
                  p10={userRow.p10}
                  p25={userRow.p25}
                  p50={userRow.p50}
                  p75={userRow.p75}
                  p90={userRow.p90}
                  userPace={parseFloat(paceMinkm.toFixed(3))}
                  ageLabel={AGE_LABEL[age]}
                  gender={gender}
                />
              );
            })()}

            <section className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Route map
              </h2>
              <RouteMap points={gpx.points} />
            </section>
          </>
        )}

        {!gpx && (
          <p className="text-center text-sm text-muted-foreground">
            Upload a GPX file above to see route stats, the map, and your predicted finish time.
          </p>
        )}
      </main>
    </div>
  );
}
