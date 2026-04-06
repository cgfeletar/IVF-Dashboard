/**
 * IvfAttritionSankey
 *
 * D3-from-scratch Sankey diagram showing egg-to-embryo attrition across
 * five IVF stages, segmented by maternal age group. Built with d3 v7 +
 * d3-sankey to demonstrate direct SVG bindable-scale work (no wrapper lib).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  sankey as d3Sankey,
  sankeyLinkHorizontal,
  type SankeyNode,
  type SankeyLink,
} from "d3-sankey";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PALETTE } from "@/lib/constants";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type AgeKey = "<35" | "35-37" | "38-40" | "41-42" | "43+";

interface AgeGroupData {
  stages: number[];
  /** Survival rate from one stage to the next (derived at init). */
  rates: number[];
  euploidRate: string;
  label: string;
}

/** Derive stage-to-stage survival rates from the reference counts. */
function deriveRates(stages: number[]): number[] {
  const rates: number[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    rates.push(stages[i + 1] / stages[i]);
  }
  return rates;
}

/** Apply survival rates to a custom starting egg count. */
function applyRates(eggs: number, rates: number[]): number[] {
  const out = [eggs];
  for (const r of rates) {
    out.push(+(out[out.length - 1] * r).toFixed(1));
  }
  return out;
}

const RAW_AGE_DATA: Record<AgeKey, Omit<AgeGroupData, "rates">> = {
  "<35":   { stages: [15, 12, 10, 5, 3],   euploidRate: "60%", label: "Under 35" },
  "35-37": { stages: [12, 10, 8,  4, 2],   euploidRate: "50%", label: "35 – 37"  },
  "38-40": { stages: [10, 8,  6,  3, 1],   euploidRate: "35%", label: "38 – 40"  },
  "41-42": { stages: [8,  6,  5,  2, 0.5], euploidRate: "22%", label: "41 – 42"  },
  "43+":   { stages: [6,  4,  3,  1, 0.3], euploidRate: "12%", label: "43+"      },
};

const AGE_DATA: Record<AgeKey, AgeGroupData> = Object.fromEntries(
  Object.entries(RAW_AGE_DATA).map(([k, v]) => [k, { ...v, rates: deriveRates(v.stages) }]),
) as Record<AgeKey, AgeGroupData>;

const AGE_KEYS: AgeKey[] = ["<35", "35-37", "38-40", "41-42", "43+"];
const STAGE_NAMES = ["Retrieved", "Mature (MII)", "Fertilized", "Blastocyst", "Euploid"];
const LOSS_NAMES  = ["Immature", "Failed fert.", "Arrested", "Aneuploid"];

const CONTINUE_COLOR = PALETTE.teal;
const NODE_CONTINUE  = PALETTE.tealHover;

/** Graduated loss colors — darkest for earliest attrition (top), lightest for latest (bottom). */
const LOSS_LINK_COLORS = ["#b5564a", "#c4877a", "#d4a89e", "#e8cdc7"];
const LOSS_NODE_COLORS = ["#a34639", "#b5564a", "#c4877a", "#d4a89e"];

// ---------------------------------------------------------------------------
// Sankey graph builder
// ---------------------------------------------------------------------------

interface GraphNode {
  id: string;
  name: string;
  value: number;
  isLoss: boolean;
  stageIndex: number;
}

interface GraphLink {
  source: number;
  target: number;
  value: number;
  isLoss: boolean;
  lossIndex: number;
}

function buildGraph(stages: number[]) {
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];

  STAGE_NAMES.forEach((name, i) => {
    nodes.push({ id: `stage-${i}`, name, value: stages[i], isLoss: false, stageIndex: i });
  });

  LOSS_NAMES.forEach((name, i) => {
    const lost = stages[i] - stages[i + 1];
    nodes.push({ id: `loss-${i}`, name, value: lost, isLoss: true, stageIndex: i });
  });

  const nodeMap = new Map(nodes.map((n, i) => [n.id, i]));

  // For each source stage, emit the loss link FIRST so d3-sankey places it
  // above the continuation link. This means the earliest attrition (Immature)
  // lands at the top of the loss column and the latest (Aneuploid) at the bottom.
  for (let i = 0; i < STAGE_NAMES.length - 1; i++) {
    const lost = stages[i] - stages[i + 1];
    links.push({
      source: nodeMap.get(`stage-${i}`)!,
      target: nodeMap.get(`loss-${i}`)!,
      value: Math.max(lost, 0.01),
      isLoss: true,
      lossIndex: i,
    });
    links.push({
      source: nodeMap.get(`stage-${i}`)!,
      target: nodeMap.get(`stage-${i + 1}`)!,
      value: stages[i + 1],
      isLoss: false,
      lossIndex: -1,
    });
  }

  return { nodes, links, retrieved: stages[0] };
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function fmt(val: number, retrieved: number, pct: boolean) {
  if (pct) return Math.round((val / retrieved) * 100) + "%";
  return val % 1 === 0 ? val.toString() : val.toFixed(1);
}

function pctOf(val: number, total: number) {
  return Math.round((val / total) * 100) + "%";
}

// ---------------------------------------------------------------------------
// Tooltip helpers (plain DOM for d3 integration)
// ---------------------------------------------------------------------------

function showNodeTooltip(
  el: HTMLDivElement,
  event: MouseEvent,
  d: SankeyNode<GraphNode, GraphLink>,
  retrieved: number,
  stages: number[],
) {
  const stageIdx = d.stageIndex;
  let dropLine = "";
  if (!d.isLoss && stageIdx > 0) {
    const prev = stages[stageIdx - 1];
    const drop = Math.round(((prev - d.value) / prev) * 100);
    dropLine = `<div class="snk-row"><span class="snk-label">Drop from prior</span><span class="snk-val snk-loss">${drop}%</span></div>`;
  }
  if (d.isLoss) {
    const parent = stages[stageIdx];
    const dropPct = Math.round((d.value / parent) * 100);
    dropLine = `<div class="snk-row"><span class="snk-label">Loss rate</span><span class="snk-val snk-loss">${dropPct}%</span></div>`;
  }
  el.innerHTML = `
    <div class="snk-title">${d.isLoss ? "⊘ " : ""}${d.name}</div>
    <div class="snk-row"><span class="snk-label">Count</span><span class="snk-val">${d.value % 1 === 0 ? d.value : d.value.toFixed(1)}</span></div>
    <div class="snk-row"><span class="snk-label">% of retrieved</span><span class="snk-val">${pctOf(d.value, retrieved)}</span></div>
    ${dropLine}
  `;
  positionTooltip(el, event);
}

function showLinkTooltip(
  el: HTMLDivElement,
  event: MouseEvent,
  d: SankeyLink<GraphNode, GraphLink>,
  retrieved: number,
  stages: number[],
) {
  const src = d.source as SankeyNode<GraphNode, GraphLink>;
  const tgt = d.target as SankeyNode<GraphNode, GraphLink>;
  const sourceVal = stages[src.stageIndex];
  const flowPct = Math.round(((d.value ?? 0) / sourceVal) * 100);
  el.innerHTML = `
    <div class="snk-title">${src.name} → ${tgt.name}</div>
    <div class="snk-row"><span class="snk-label">Count</span><span class="snk-val">${(d.value ?? 0) % 1 === 0 ? d.value : (d.value ?? 0).toFixed(1)}</span></div>
    <div class="snk-row"><span class="snk-label">% of retrieved</span><span class="snk-val">${pctOf(d.value ?? 0, retrieved)}</span></div>
    <div class="snk-row"><span class="snk-label">${d.isLoss ? "Loss" : "Continuation"} rate</span><span class="snk-val">${flowPct}%</span></div>
  `;
  positionTooltip(el, event);
}

function positionTooltip(el: HTMLDivElement, event: MouseEvent) {
  el.style.opacity = "1";
  const pad = 12;
  const rect = el.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - pad) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - pad) y = event.clientY - rect.height - pad;
  el.style.left = x + "px";
  el.style.top = y + "px";
}

function hideTooltip(el: HTMLDivElement) {
  el.style.opacity = "0";
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function IvfAttritionSankey() {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [ageKey, setAgeKey] = useState<AgeKey>("<35");
  const [showPct, setShowPct] = useState(false);
  const [customEggs, setCustomEggs] = useState<string>("");

  const data = useMemo(() => AGE_DATA[ageKey], [ageKey]);

  const activeStages = useMemo(() => {
    const parsed = parseFloat(customEggs);
    if (!customEggs || isNaN(parsed) || parsed <= 0) return data.stages;
    return applyRates(parsed, data.rates);
  }, [customEggs, data]);

  const render = useCallback(() => {
    const svgEl = svgRef.current;
    const tipEl = tooltipRef.current;
    if (!svgEl || !tipEl) return;

    const container = svgEl.parentElement!;
    const width  = Math.max(container.clientWidth, 400);
    const height = 380;
    const margin = { top: 28, right: 24, bottom: 16, left: 24 };

    const svg = d3.select(svgEl)
      .attr("viewBox", `0 0 ${width} ${height}`)
      .attr("width", "100%")
      .attr("height", height);

    const { nodes, links, retrieved } = buildGraph(activeStages);
    const stages = activeStages;

    const sankeyLayout = d3Sankey<GraphNode, GraphLink>()
      .nodeId((d) => d.index!)
      .nodeWidth(14)
      .nodePadding(18)
      .nodeSort(null)
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ]);

    const graph = sankeyLayout({
      nodes: nodes.map((d) => ({ ...d })),
      links: links.map((d) => ({ ...d })),
    });

    // Clear previous
    svg.selectAll("*").remove();
    const g = svg.append("g");

    // Stage column headers
    graph.nodes
      .filter((n) => !n.isLoss)
      .forEach((n) => {
        g.append("text")
          .attr("text-anchor", "middle")
          .attr("x", ((n.x0 ?? 0) + (n.x1 ?? 0)) / 2)
          .attr("y", margin.top - 10)
          .attr("font-size", "11px")
          .attr("fill", "var(--color-muted-foreground, #78716c)")
          .attr("font-weight", 500)
          .attr("font-family", "DM Sans, system-ui, sans-serif")
          .text(n.name);
      });

    // Links
    g.selectAll<SVGPathElement, SankeyLink<GraphNode, GraphLink>>(".snk-link")
      .data(graph.links)
      .join("path")
        .attr("class", "snk-link")
        .attr("d", sankeyLinkHorizontal())
        .attr("fill", "none")
        .attr("stroke", (d) =>
          d.isLoss ? LOSS_LINK_COLORS[d.lossIndex] ?? LOSS_LINK_COLORS[0] : CONTINUE_COLOR,
        )
        .attr("stroke-width", (d) => Math.max(1, d.width ?? 0))
        .style("stroke-opacity", 0)
        .on("mouseenter", function (event: MouseEvent, d) {
          d3.select(this).style("stroke-opacity", 0.6);
          showLinkTooltip(tipEl, event, d, retrieved, stages);
        })
        .on("mousemove", function (event: MouseEvent, d) {
          positionTooltip(tipEl, event);
        })
        .on("mouseleave", function () {
          d3.select(this).style("stroke-opacity", (d: SankeyLink<GraphNode, GraphLink>) =>
            d.isLoss ? 0.2 : 0.35,
          );
          hideTooltip(tipEl);
        })
      .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .style("stroke-opacity", (d) => (d.isLoss ? 0.2 : 0.35));

    // Nodes
    const nodeSel = g
      .selectAll<SVGGElement, SankeyNode<GraphNode, GraphLink>>(".snk-node")
      .data(graph.nodes)
      .join("g")
        .attr("class", "snk-node")
        .on("mouseenter", function (event: MouseEvent, d) {
          showNodeTooltip(tipEl, event, d, retrieved, stages);
        })
        .on("mousemove", function (event: MouseEvent) {
          positionTooltip(tipEl, event);
        })
        .on("mouseleave", () => hideTooltip(tipEl));

    nodeSel
      .append("rect")
        .attr("x", (d) => d.x0 ?? 0)
        .attr("y", (d) => d.y0 ?? 0)
        .attr("height", (d) => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
        .attr("width", sankeyLayout.nodeWidth())
        .attr("fill", (d) =>
          d.isLoss ? LOSS_NODE_COLORS[d.stageIndex] ?? LOSS_NODE_COLORS[0] : NODE_CONTINUE,
        )
        .attr("rx", 2)
        .attr("opacity", 0)
      .transition()
        .duration(600)
        .ease(d3.easeCubicOut)
        .attr("opacity", 1);

    // Node labels
    nodeSel
      .append("text")
        .attr("x", (d) =>
          d.isLoss
            ? (d.x1 ?? 0) + 8
            : (d.x0 ?? 0) < width / 2
              ? (d.x1 ?? 0) + 8
              : (d.x0 ?? 0) - 8,
        )
        .attr("y", (d) => ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", (d) => {
          if (d.isLoss) return "start";
          return (d.x0 ?? 0) < width / 2 ? "start" : "end";
        })
        .attr("font-size", (d) => (d.isLoss ? "10px" : "11px"))
        .attr("fill", (d) =>
          d.isLoss
            ? LOSS_NODE_COLORS[d.stageIndex] ?? LOSS_NODE_COLORS[0]
            : "var(--color-foreground, #1c1917)",
        )
        .attr("font-weight", (d) => (d.isLoss ? 400 : 600))
        .attr("font-family", "DM Sans, system-ui, sans-serif")
        .attr("opacity", 0)
        .text((d) => {
          const v = fmt(d.value, retrieved, showPct);
          return d.isLoss ? `−${v} ${d.name}` : v;
        })
      .transition()
        .duration(600)
        .delay(200)
        .attr("opacity", 1);

    // Euploid rate annotation
    const euploidNode = graph.nodes.find((n) => n.id === "stage-4");
    if (euploidNode) {
      g.append("text")
        .attr("x", ((euploidNode.x0 ?? 0) + (euploidNode.x1 ?? 0)) / 2)
        .attr("y", (euploidNode.y1 ?? 0) + 18)
        .attr("text-anchor", "middle")
        .attr("font-size", "10px")
        .attr("fill", PALETTE.teal)
        .attr("font-weight", 600)
        .attr("font-family", "DM Sans, system-ui, sans-serif")
        .attr("opacity", 0)
        .text(`Euploid rate: ${data.euploidRate}`)
      .transition()
        .duration(600)
        .delay(400)
        .attr("opacity", 1);
    }
  }, [ageKey, showPct, data, activeStages]);

  // Render on mount + state changes
  useEffect(() => {
    render();
  }, [render]);

  // Responsive resize
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(render, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [render]);

  const isCustom = customEggs !== "" && !isNaN(parseFloat(customEggs)) && parseFloat(customEggs) > 0;
  const displayStages = activeStages;
  const displayEuploidRate = isCustom
    ? Math.round((displayStages[4] / displayStages[0]) * 100) + "%"
    : data.euploidRate;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tracking-tight">
          IVF Attrition: Egg to Embryo
        </CardTitle>
        <CardDescription>
          How many eggs survive each stage of IVF, by maternal age group
        </CardDescription>
      </CardHeader>

      <CardContent>
        {/* Controls row */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          {/* Age tabs */}
          <div
            className="flex gap-1 rounded-lg bg-muted p-1"
            role="tablist"
            aria-label="Age group selector"
          >
            {AGE_KEYS.map((key) => (
              <button
                key={key}
                role="tab"
                aria-selected={key === ageKey}
                onClick={() => setAgeKey(key)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                  key === ageKey
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {AGE_DATA[key].label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Custom egg input */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="custom-eggs"
                className="text-xs font-medium text-muted-foreground whitespace-nowrap"
              >
                My eggs
              </label>
              <Input
                id="custom-eggs"
                type="number"
                min={1}
                max={100}
                step={1}
                placeholder={String(data.stages[0])}
                value={customEggs}
                onChange={(e) => setCustomEggs(e.target.value)}
                className="w-[4.5rem] tabular-nums text-center"
                aria-label="Enter your number of retrieved eggs"
              />
              {isCustom && (
                <button
                  onClick={() => setCustomEggs("")}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Reset to default egg count"
                >
                  Reset
                </button>
              )}
            </div>

            {/* Pct toggle */}
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground select-none">
              <span>Counts</span>
              <button
                role="switch"
                aria-checked={showPct}
                onClick={() => setShowPct((p) => !p)}
                className={[
                  "relative h-5 w-9 rounded-full border transition-colors",
                  showPct
                    ? "border-primary bg-primary"
                    : "border-border bg-muted",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform",
                    showPct ? "translate-x-4" : "",
                  ].join(" ")}
                />
              </button>
              <span>% of retrieved</span>
            </label>
          </div>
        </div>

        {/* Sankey diagram */}
        <div
          role="img"
          aria-label={`Sankey diagram showing IVF egg attrition for age group ${AGE_DATA[ageKey].label}`}
        >
          <svg ref={svgRef} />
        </div>

        {/* Summary bar */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-lg bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
          <span className="text-base font-bold tabular-nums">
            {displayStages[0] % 1 === 0 ? displayStages[0] : displayStages[0].toFixed(1)}
          </span>
          <span>retrieved</span>
          <span className="text-muted-foreground">→</span>
          <span className="text-base font-bold tabular-nums">
            {displayStages[4] % 1 === 0 ? displayStages[4] : displayStages[4].toFixed(1)}
          </span>
          <span>euploid</span>
          <span className="text-muted-foreground">→</span>
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
            {displayEuploidRate} euploid rate
          </span>
        </div>

        {/* Sources */}
        <p className="mt-3 text-center text-[10px] leading-relaxed text-muted-foreground/60">
          Sources: SART national data · Demko et al. 2016 ·{" "}
          <em>Fertility &amp; Sterility</em> PGT-A study (2021)
        </p>
      </CardContent>

      {/* Tooltip — portal-style fixed div */}
      <div
        ref={tooltipRef}
        className="snk-tooltip pointer-events-none fixed z-50 max-w-[220px] rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg ring-1 ring-foreground/10 opacity-0 transition-opacity"
      />
    </Card>
  );
}
