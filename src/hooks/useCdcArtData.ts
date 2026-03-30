import { useQuery } from "@tanstack/react-query";
import type { CdcArtRecord, CdcApiResponse } from "@/types/cdc";

const CDC_BASE_URL = "https://data.cdc.gov/resource/9tjt-seye.json";

export type CdcQueryParams = {
  /** Two-letter state abbreviation, e.g. "OR". Omit for national data. */
  state?: string;
  /** Data year, e.g. "2022". */
  year?: string;
  /** Maximum records to return. Default: 1000. */
  limit?: number;
};

async function fetchCdcArtData(params: CdcQueryParams): Promise<CdcArtRecord[]> {
  const searchParams = new URLSearchParams();

  const whereClauses: string[] = [];
  if (params.state) {
    whereClauses.push(`locationabbr='${params.state.toUpperCase()}'`);
  }
  if (params.year) {
    whereClauses.push(`year='${params.year}'`);
  }
  if (whereClauses.length > 0) {
    searchParams.set("$where", whereClauses.join(" AND "));
  }

  searchParams.set("$limit", String(params.limit ?? 1000));

  const url = `${CDC_BASE_URL}?${searchParams.toString()}`;

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

export function useCdcArtData(params: CdcQueryParams = {}) {
  return useQuery({
    queryKey: ["cdc-art", params.state, params.year, params.limit] as const,
    queryFn: () => fetchCdcArtData(params),
    staleTime: 1000 * 60 * 10,
  });
}
