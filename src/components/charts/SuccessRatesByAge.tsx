/**
 * SuccessRatesByAge
 *
 * Grouped bar chart of cumulative live birth rates by age bracket,
 * comparing PGT-A tested vs non-PGT-A frozen embryo transfers.
 *
 * Data: Harris et al. (2024), Fertility and Sterility, PMID 39349118.
 * n = 56,469 SART CORS cycles (2016–2019), patients aged 21–40.
 * Note: >40 not in study. Rates are unadjusted cumulative from first stim.
 */

import { ResponsiveBar } from "@nivo/bar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { InfoTip } from "@/components/ui/info-tip";
import { transformSartPgtData } from "@/lib/transforms";
import { SART_PGT_DATA } from "@/lib/sartPgtData";
import { NIVO_THEME, PALETTE } from "@/lib/constants";

const PGT_KEYS = ["PGT-A", "Non-PGT-A"] as const;

const PGT_COLORS: Record<string, string> = {
  "PGT-A": PALETTE.teal,
  "Non-PGT-A": PALETTE.dustyRose,
};

const CHART_DATA = transformSartPgtData(SART_PGT_DATA);

export function SuccessRatesByAge() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="tracking-tight">
          Live Birth Rates by Age: PGT-A vs Non-PGT-A
        </CardTitle>
        <CardAction>
          <InfoTip>
            <p className="font-medium">Source</p>
            <p>Harris et al. (2024), <em>Fertility and Sterility</em>, PMID 39349118. SART CORS national data, n=181,609 eSET frozen embryo transfer cycles (2016–2019), patients aged 21–40.</p>
          </InfoTip>
        </CardAction>
        <CardDescription>
          Live birth rate per frozen embryo transfer — SART national data,
          n=181,609 eSET cycles
        </CardDescription>
      </CardHeader>

      <CardContent className="flex-1 min-h-0">
        <div className="h-full">
          <ResponsiveBar
            data={CHART_DATA}
            keys={[...PGT_KEYS]}
            indexBy="ageGroup"
            groupMode="grouped"
            margin={{ top: 16, right: 16, bottom: 62, left: 52 }}
            padding={0.3}
            innerPadding={3}
            colors={(bar) => PGT_COLORS[bar.id as string] ?? "#999"}
            theme={NIVO_THEME}
            axisBottom={{
              tickSize: 0,
              tickPadding: 10,
              legend: "Age group",
              legendPosition: "middle",
              legendOffset: 32,
            }}
            axisLeft={{
              tickSize: 0,
              tickPadding: 8,
              tickValues: 5,
              legend: "Live birth rate (%)",
              legendPosition: "middle",
              legendOffset: -44,
              format: (v) => `${v}%`,
            }}
            enableLabel={false}
            enableGridX={false}
            legends={[
              {
                dataFrom: "keys",
                anchor: "bottom",
                direction: "row",
                translateY: 60,
                itemWidth: 100,
                itemHeight: 16,
                itemTextColor: "#666",
                symbolSize: 10,
                symbolShape: "circle",
              },
            ]}
            tooltip={({ id, value, indexValue }) => (
              <div className="min-w-[180px] rounded-md bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
                <p className="font-medium">{String(indexValue)}</p>
                <p>
                  {String(id)}: <span className="font-semibold">{value}%</span>
                </p>
              </div>
            )}
            role="img"
            ariaLabel="Grouped bar chart of cumulative live birth rates by age comparing PGT-A and non-PGT-A frozen embryo transfers"
            barAriaLabel={(e) =>
              `${String(e.id)}, age ${String(e.indexValue)}: ${String(e.value)}%`
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}
