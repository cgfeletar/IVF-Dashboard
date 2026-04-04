import { useQuery, useQueries } from "@tanstack/react-query";
import { CDC_SUMMARY_DATASETS, YEARS } from "@/lib/constants";
import type { Year } from "@/lib/constants";
import type { CdcArtRecord, CdcApiResponse } from "@/types/cdc";

export type CdcQueryParams = {
  /** Two-letter state abbreviation, e.g. "OR". Omit for national data. */
  state?: string;
  /** Data year, e.g. "2022". */
  year?: Year;
  /** Maximum records to return. Default: 1000. */
  limit?: number;
};

function buildUrl(resourceId: string, params: Omit<CdcQueryParams, "year">): string {
  const searchParams = new URLSearchParams();

  if (params.state) {
    searchParams.set(
      "$where",
      `locationabbr='${params.state.toUpperCase()}'`,
    );
  }

  searchParams.set("$limit", String(params.limit ?? 1000));

  return `https://data.cdc.gov/resource/${resourceId}.json?${searchParams.toString()}`;
}

async function fetchCdcArtData(
  resourceId: string,
  params: Omit<CdcQueryParams, "year">,
): Promise<CdcArtRecord[]> {
  const url = buildUrl(resourceId, params);

  const headers: HeadersInit = {};
  const appToken = import.meta.env.VITE_CDC_APP_TOKEN;
  if (appToken) {
    headers["X-App-Token"] = appToken;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(`CDC API error: ${response.status} ${response.statusText}`);
  }

  const data: CdcApiResponse = await response.json();
  return data;
}

/** Fetch a single year of CDC ART summary data. */
export function useCdcArtData(params: CdcQueryParams = {}) {
  const year = params.year ?? "2022";
  const resourceId = CDC_SUMMARY_DATASETS[year];

  return useQuery({
    queryKey: ["cdc-art", year, params.state, params.limit] as const,
    queryFn: () => fetchCdcArtData(resourceId, params),
    staleTime: 1000 * 60 * 10,
  });
}

/** Fetch multiple years in parallel, returning { year, data }[] when all resolve. */
export function useCdcArtMultiYear(
  years: readonly Year[] = YEARS,
  params: Omit<CdcQueryParams, "year"> = {},
) {
  const queries = useQueries({
    queries: years.map((year) => ({
      queryKey: ["cdc-art", year, params.state, params.limit] as const,
      queryFn: () => fetchCdcArtData(CDC_SUMMARY_DATASETS[year], params),
      staleTime: 1000 * 60 * 10,
    })),
  });

  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);

  const data = isLoading
    ? undefined
    : years.map((year, i) => ({ year, records: queries[i].data ?? [] }));

  const refetch = () => queries.forEach((q) => q.refetch());

  return { data, isLoading, isError, refetch };
}
