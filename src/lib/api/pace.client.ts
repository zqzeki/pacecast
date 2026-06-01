import { supabase } from "../supabase.client";

export interface PacePercentiles {
  age_group: string;
  gender: string;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_count: number;
}

export async function getPacePercentiles(year: number): Promise<PacePercentiles[]> {
  const { data, error } = await supabase
    .from("pace_percentiles")
    .select("age_group, gender, p10, p25, p50, p75, p90, sample_count")
    .eq("year", year);

  if (error || !data) return [];
  return data as PacePercentiles[];
}
