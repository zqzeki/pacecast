export type RaceDistance = "5k" | "10k" | "half" | "full";
export type AgeGroup = "18-34" | "35-54" | "55+";
export type Gender = "male" | "female";

export const RACE_KM: Record<RaceDistance, number> = {
  "5k": 5,
  "10k": 10,
  half: 21.0975,
  full: 42.195,
};

export const RACE_LABEL: Record<RaceDistance, string> = {
  "5k": "5K",
  "10k": "10K",
  half: "Half Marathon",
  full: "Full Marathon",
};

// Fallback static factors used when Supabase data is unavailable
const AGE_FACTOR_STATIC: Record<AgeGroup, number> = {
  "18-34": 1.0,
  "35-54": 1.06,
  "55+":   1.15,
};

const GENDER_FACTOR_STATIC: Record<Gender, number> = {
  male:   1.0,
  female: 1.04,
};

// Maps app age group keys → Supabase stored format
const DB_AGE_GROUP: Record<AgeGroup, string> = {
  "18-34": "18 - 34",
  "35-54": "35 - 54",
  "55+":   "55 +",
};

export interface PaceRow {
  age_group: string;
  gender: string;
  p50: number;
}

/**
 * Derives age & gender factors from live Supabase median pace data.
 * Baseline = M 18-34. All other groups are expressed as a ratio to that baseline.
 * Returns null if data is missing, so callers can fall back to static factors.
 */
export function deriveFactors(
  rows: PaceRow[],
  age: AgeGroup,
  gender: Gender,
): { ageFactor: number; genderFactor: number } | null {
  const get = (ag: string, g: string) =>
    rows.find((r) => r.age_group === ag && r.gender === g)?.p50 ?? null;

  const baseline = get("18 - 34", "M");
  const userGroup = get(DB_AGE_GROUP[age], gender === "male" ? "M" : "F");
  const maleGroup = get(DB_AGE_GROUP[age], "M");

  if (baseline === null || userGroup === null || maleGroup === null) return null;

  // ageFactor = ratio of male same-age-group vs male 18-34 baseline
  const ageFactor = maleGroup / baseline;
  // genderFactor = ratio of user's group vs male same-age-group
  const genderFactor = userGroup / maleGroup;

  return { ageFactor, genderFactor };
}

/** Pick the standard race distance closest to the GPX route length. */
export function detectRaceDistance(distanceKm: number): RaceDistance {
  const entries = Object.entries(RACE_KM) as [RaceDistance, number][];
  let best: RaceDistance = "5k";
  let bestDiff = Infinity;
  for (const [k, v] of entries) {
    const d = Math.abs(v - distanceKm);
    if (d < bestDiff) {
      bestDiff = d;
      best = k;
    }
  }
  return best;
}

/** Parse "HH:MM:SS" or "MM:SS" into seconds. Returns null if invalid. */
export function parseTimeToSeconds(input: string): number | null {
  const s = input.trim();
  if (!s) return null;
  const parts = s.split(":").map((p) => p.trim());
  if (parts.some((p) => !/^\d+$/.test(p))) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  let h = 0,
    m = 0,
    sec = 0;
  if (nums.length === 3) [h, m, sec] = nums;
  else if (nums.length === 2) [m, sec] = nums;
  else return null;
  if (m >= 60 || sec >= 60) return null;
  return h * 3600 + m * 60 + sec;
}

export interface PredictionInput {
  /** Detected race distance (from GPX) the user is targeting. */
  targetRace: RaceDistance;
  /** Elevation gain of the uploaded GPX route, in meters. */
  routeElevationGain: number;
  /** User's previous race distance. */
  previousRace: RaceDistance;
  /** User's previous finish time, in seconds. */
  previousTimeSec: number;
  age: AgeGroup;
  gender: Gender;
}

export function predictFinishTime(
  input: PredictionInput,
  factors?: { ageFactor: number; genderFactor: number },
): number {
  const targetKm = RACE_KM[input.targetRace];
  const prevKm = RACE_KM[input.previousRace];

  // Riegel formula: T2 = T1 * (D2 / D1)^1.06
  const riegel = input.previousTimeSec * Math.pow(targetKm / prevKm, 1.06);

  // Elevation penalty: ~12s/km per 100m of gain
  const elevationPenalty = (input.routeElevationGain / 100) * 12 * targetKm;

  // Use data-driven factors from Supabase if available, otherwise fall back to static
  const ageFactor = factors?.ageFactor ?? AGE_FACTOR_STATIC[input.age];
  const genderFactor = factors?.genderFactor ?? GENDER_FACTOR_STATIC[input.gender];

  return (riegel + elevationPenalty) * ageFactor * genderFactor;
}

/**
 * Given a predicted pace (min/km) and the percentile table from Supabase,
 * returns an estimated percentile (0–100) where 100 = fastest.
 * Interpolates linearly between the known breakpoints.
 */
export function estimatePercentile(
  paceMinkm: number,
  p: { p10: number; p25: number; p50: number; p75: number; p90: number },
): number {
  // Breakpoints: [pace, cumulative percentile] — faster pace = higher percentile
  const points: [number, number][] = [
    [p.p10, 90],
    [p.p25, 75],
    [p.p50, 50],
    [p.p75, 25],
    [p.p90, 10],
  ];

  if (paceMinkm <= p.p10) return 95;
  if (paceMinkm >= p.p90) return 5;

  for (let i = 0; i < points.length - 1; i++) {
    const [lo, hiPct] = points[i];
    const [hi, loPct] = points[i + 1];
    if (paceMinkm >= lo && paceMinkm <= hi) {
      const t = (paceMinkm - lo) / (hi - lo);
      return Math.round(hiPct + t * (loPct - hiPct));
    }
  }
  return 50;
}

/** Format a pace in min/km as "M:SS /km" */
export function formatPace(paceMinkm: number): string {
  const totalSec = Math.round(paceMinkm * 60);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")} /km`;
}

export function formatTime(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}
