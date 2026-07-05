import { useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

// ISO 3166-1 numeric ids used by world-atlas topojson
const ISO_NUMERIC: Record<string, string> = {
  US: "840", IN: "356", DE: "276", GB: "826", BR: "076",
  JP: "392", FR: "250", CA: "124", AU: "036", SG: "702",
};

// Approximate centroids for marker dots
const CENTROIDS: Record<string, [number, number]> = {
  US: [-98, 39], IN: [78, 22], DE: [10, 51], GB: [-2, 54], BR: [-52, -10],
  JP: [138, 36], FR: [2, 46], CA: [-106, 56], AU: [134, -25], SG: [103.8, 1.35],
};

export interface CountryDatum {
  code: string;
  name: string;
  flag: string;
  requests: number;
  share: number; // 0..1
  p95: number;
  errRate: number;
}

interface TooltipState {
  x: number;
  y: number;
  datum: CountryDatum;
}

export function WorldChoropleth({ data, formatRequests }: {
  data: CountryDatum[];
  formatRequests: (n: number) => string;
}) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const byNumericId = new Map(data.map((d) => [ISO_NUMERIC[d.code], d]));
  const maxShare = Math.max(...data.map((d) => d.share), 0.0001);

  return (
    <div
      className="relative w-full"
      onMouseLeave={() => setTooltip(null)}
    >
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150, center: [12, 8] }}
        width={880}
        height={400}
        style={{ width: "100%", height: "auto" }}
        aria-label="World map of request volume by country"
      >
        <Geographies geography={GEO_URL}>
          {({ geographies }) =>
            geographies
              .filter((geo) => geo.id !== "010") /* hide Antarctica */
              .map((geo) => {
                const datum = byNumericId.get(String(geo.id));
                const intensity = datum ? 0.25 + 0.75 * (datum.share / maxShare) : 0;
                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={datum ? "var(--brand)" : "var(--bg3)"}
                    fillOpacity={datum ? intensity : 0.6}
                    stroke="var(--border)"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none", transition: "fill-opacity 150ms" },
                      hover: { outline: "none", fillOpacity: datum ? 1 : 0.6, cursor: datum ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                    onMouseMove={(e) => {
                      if (!datum) return;
                      const rect = (e.currentTarget as SVGElement).closest("div")?.getBoundingClientRect();
                      setTooltip({
                        x: e.clientX - (rect?.left ?? 0),
                        y: e.clientY - (rect?.top ?? 0),
                        datum,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
          }
        </Geographies>
        {data.map((d) => {
          const coords = CENTROIDS[d.code];
          if (!coords) return null;
          const r = 2.5 + 6 * (d.share / maxShare);
          return (
            <Marker key={d.code} coordinates={coords}>
              <circle r={r} fill="var(--brand)" fillOpacity={0.9} stroke="var(--bg1)" strokeWidth={1} />
            </Marker>
          );
        })}
      </ComposableMap>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-[8px] border border-[var(--border)] bg-[var(--bg2)] px-3 py-2 shadow-lg"
          style={{ left: Math.min(tooltip.x + 12, 640), top: tooltip.y - 8 }}
          role="status"
        >
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--text)]">
            <span>{tooltip.datum.flag}</span> {tooltip.datum.name}
          </div>
          <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            <span className="text-[var(--text3)]">Requests</span>
            <span className="text-right tabular-nums text-[var(--text)]">{formatRequests(tooltip.datum.requests)}</span>
            <span className="text-[var(--text3)]">Share</span>
            <span className="text-right tabular-nums text-[var(--text)]">{Math.round(tooltip.datum.share * 100)}%</span>
            <span className="text-[var(--text3)]">P95</span>
            <span className="text-right tabular-nums" style={{ color: tooltip.datum.p95 > 500 ? "var(--amber)" : "var(--green)" }}>
              {Math.round(tooltip.datum.p95)}ms
            </span>
            <span className="text-[var(--text3)]">Error rate</span>
            <span className="text-right tabular-nums text-[var(--text)]">{tooltip.datum.errRate.toFixed(2)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
