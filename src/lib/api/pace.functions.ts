import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getSupabaseAdmin } from "../supabase.server";

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

/**
 * Fetches all 6 pace_percentile rows for the given year.
 * Used to compute data-driven age/gender factors for prediction.
 */
export const getAllPacePercentiles = createServerFn({ method: "POST" })
  .inputValidator(z.object({ year: z.number().int().default(2019) }))
  .handler(async ({ data }): Promise<PacePercentiles[]> => {
    const supabase = getSupabaseAdmin();
    const { data: rows, error } = await supabase
      .from("pace_percentiles")
      .select("age_group, gender, p10, p25, p50, p75, p90, sample_count")
      .eq("year", data.year);

    if (error || !rows) return [];
    return rows as PacePercentiles[];
  });
