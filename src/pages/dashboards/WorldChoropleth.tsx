import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { STATE_COLOR, STATE_WORD } from "./board/kit";
import type { Country } from "./board/fixtures";

/*
 * Request volume by country. Land is neutral; served countries take white at
 * an intensity set by their share of traffic. Only a failing or degraded
 * country carries colour, as a square lamp at its centroid. The country
 * ledger beside the map is the accessible equivalent of this chart.
 */

const GEO_URL = "/data/countries-110m.json";

const ISO_NUMERIC: Record<string, string> = {
  US: "840", IN: "356", DE: "276", GB: "826", BR: "076",
  JP: "392", FR: "250", CA: "124", AU: "036", SG: "702",
};

const CENTROIDS: Record<string, [number, number]> = {
  US: [-98, 39], IN: [78, 22], DE: [10, 51], GB: [-2, 54], BR: [-52, -10],
  JP: [138, 36], FR: [2, 46], CA: [-106, 56], AU: [134, -25], SG: [103.8, 1.35],
};

export function WorldChoropleth({ data, format }: { data: Country[]; format: (n: number) => string }) {
  const [hover, setHover] = useState<Country | null>(null);
  const byId = new Map(data.map((d) => [ISO_NUMERIC[d.code], d]));
  const maxReq = Math.max(...data.map((d) => d.requests), 1);

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150, center: [12, 8] }}
        width={880}
        height={400}
        style={{ width: "100%", height: "auto" }}
        role="img"
        aria-label="World map of request volume by country"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies.flatMap((geo) => {
              if (geo.id === "010") return [];
              const d = byId.get(String(geo.id));
              const intensity = d ? 0.18 + 0.62 * (d.requests / maxReq) : 0;
              return [
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={d ? "var(--text)" : "var(--bg3)"}
                  fillOpacity={d ? intensity : 0.7}
                  stroke="var(--bg1)"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { outline: "none", fillOpacity: d ? Math.min(1, intensity + 0.2) : 0.7 },
                    pressed: { outline: "none" },
                  }}
                  onMouseEnter={() => d && setHover(d)}
                  onMouseLeave={() => setHover(null)}
                />,
              ];
            })
          }
        </Geographies>
        {data
          .filter((d) => d.state === "bad" || d.state === "warn")
          .map((d) => {
            const c = CENTROIDS[d.code];
            if (!c) return null;
            return (
              <Marker key={d.code} coordinates={c}>
                <rect x={-5} y={-5} width={10} height={10} rx={2} fill={STATE_COLOR[d.state]} stroke="var(--bg1)" strokeWidth={2} />
              </Marker>
            );
          })}
      </ComposableMap>

      <div className="pointer-events-none absolute bottom-2 left-2 min-h-[52px] min-w-[200px]" aria-hidden="true">
        {hover ? (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2">
            <p className="text-[12px] font-semibold text-[var(--text)]">
              <span className="mr-1.5 font-mono text-[var(--text3)]">{hover.code}</span>
              {hover.name}
            </p>
            <p className="mt-1 font-mono text-[11px] text-[var(--text2)]">
              {format(hover.requests)} req · p95 {hover.p95}ms ·{" "}
              <span style={{ color: hover.state === "ok" ? undefined : STATE_COLOR[hover.state] }}>{STATE_WORD[hover.state]}</span>
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 px-1 text-[11px] text-[var(--text3)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-6 rounded-[2px]" style={{ background: "linear-gradient(90deg, color-mix(in oklab, var(--text) 18%, var(--bg1)), color-mix(in oklab, var(--text) 80%, var(--bg1)))" }} />
              Request share
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ background: "var(--red)" }} /> Failing
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-[2px]" style={{ background: "var(--amber)" }} /> Degraded
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
