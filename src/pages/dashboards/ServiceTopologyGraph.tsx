import { useMemo, useState } from "react";
import { seededSeries } from "./lib";

// ────────────────────────────────────────────────────────────────
// Service topology graph — layered DAG rendered as SVG.
// Nodes are placed in columns (edge → gateway → services → data/external),
// edges are cubic bezier curves colored by health with animated flow dots.
// ────────────────────────────────────────────────────────────────

export interface TopoNode {
  id: string;
  label: string;
  layer: number; // 0 = leftmost
  kind: "edge" | "gateway" | "service" | "datastore" | "external";
  rps: number;
  errRate: number; // %
  p95: number; // ms
}

export interface TopoEdge {
  from: string;
  to: string;
  volume: number; // relative 0..1
  errRate: number; // %
}

const KIND_META: Record<TopoNode["kind"], { label: string }> = {
  edge: { label: "EDGE" },
  gateway: { label: "GATEWAY" },
  service: { label: "SERVICE" },
  datastore: { label: "DATA" },
  external: { label: "3RD PARTY" },
};

function healthColor(errRate: number, p95: number): string {
  if (errRate > 5 || p95 > 800) return "var(--red)";
  if (errRate > 1 || p95 > 300) return "var(--amber)";
  return "var(--green)";
}

const W = 980;
const H = 460;
const NODE_W = 148;
const NODE_H = 64;

export function ServiceTopologyGraph({
  nodes,
  edges,
  selected,
  onSelect,
}: {
  nodes: TopoNode[];
  edges: TopoEdge[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [hovered, setHovered] = useState<string | null>(null);

  const positions = useMemo(() => {
    const layers = new Map<number, TopoNode[]>();
    for (const n of nodes) {
      const arr = layers.get(n.layer) ?? [];
      arr.push(n);
      layers.set(n.layer, arr);
    }
    const layerCount = Math.max(...nodes.map((n) => n.layer)) + 1;
    const colW = (W - NODE_W - 40) / Math.max(1, layerCount - 1);
    const pos = new Map<string, { x: number; y: number }>();
    for (const [layer, arr] of layers) {
      const gap = H / (arr.length + 1);
      arr.forEach((n, i) => {
        pos.set(n.id, { x: 20 + layer * colW, y: gap * (i + 1) - NODE_H / 2 });
      });
    }
    return pos;
  }, [nodes]);

  const active = hovered ?? selected;
  const connected = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>([active]);
    for (const e of edges) {
      if (e.from === active) set.add(e.to);
      if (e.to === active) set.add(e.from);
    }
    return set;
  }, [active, edges]);

  return (
    <div className="relative w-full overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[720px] w-full" role="img" aria-label="Service dependency topology graph">
        {/* Edges */}
        {edges.map((e) => {
          const a = positions.get(e.from);
          const b = positions.get(e.to);
          if (!a || !b) return null;
          const x1 = a.x + NODE_W;
          const y1 = a.y + NODE_H / 2;
          const x2 = b.x;
          const y2 = b.y + NODE_H / 2;
          const mx = (x1 + x2) / 2;
          const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
          const color = e.errRate > 5 ? "var(--red)" : e.errRate > 1 ? "var(--amber)" : "var(--brand)";
          const dim = connected ? !(connected.has(e.from) && connected.has(e.to) && (e.from === active || e.to === active)) : false;
          return (
            <g key={`${e.from}-${e.to}`} opacity={dim ? 0.12 : 1}>
              <path d={d} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={1.5 + e.volume * 4} />
              <circle r={2.5} fill={color}>
                <animateMotion dur={`${2.5 - e.volume * 1.2}s`} repeatCount="indefinite" path={d} />
              </circle>
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((n) => {
          const p = positions.get(n.id);
          if (!p) return null;
          const tone = healthColor(n.errRate, n.p95);
          const dim = connected ? !connected.has(n.id) : false;
          const isSel = selected === n.id;
          return (
            <g
              key={n.id}
              transform={`translate(${p.x}, ${p.y})`}
              opacity={dim ? 0.25 : 1}
              className="cursor-pointer transition-opacity"
              onMouseEnter={() => setHovered(n.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onSelect(isSel ? null : n.id)}
            >
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill="var(--bg2)"
                stroke={isSel ? "var(--brand)" : "var(--border)"}
                strokeWidth={isSel ? 2 : 1}
              />
              <rect width={3} height={NODE_H} rx={1.5} fill={tone} />
              <text x={14} y={18} fill="var(--text3)" fontSize={8} letterSpacing={1.2} fontWeight={600}>
                {KIND_META[n.kind].label}
              </text>
              <text x={14} y={34} fill="var(--text)" fontSize={12} fontWeight={600}>
                {n.label.length > 18 ? n.label.slice(0, 17) + "…" : n.label}
              </text>
              <text x={14} y={51} fill="var(--text2)" fontSize={10} className="tabular-nums">
                {n.rps} rps · {n.errRate.toFixed(1)}% err · {n.p95}ms
              </text>
              <circle cx={NODE_W - 14} cy={14} r={4} fill={tone}>
                {(n.errRate > 5 || n.p95 > 800) && (
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
                )}
              </circle>
            </g>
          );
        })}
      </svg>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[var(--text3)]">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--green)]" /> Healthy</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--amber)]" /> Degraded</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[var(--red)]" /> Critical</span>
        <span className="ml-auto">Edge thickness ∝ traffic volume · click a node to inspect</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Synthesized topology: merges live span stats into a realistic
// service graph (edge → gateway → services → datastores/external).
// ────────────────────────────────────────────────────────────────

export function buildTopology(liveServices: { svc: string; count: number; errRate: number; p95: number }[]): { nodes: TopoNode[]; edges: TopoEdge[] } {
  const live = new Map(liveServices.map((s) => [s.svc, s]));
  const rpsOf = (base: number, key: string) => Math.round(base + (seededSeries(key, 1, base * 0.2, base * 0.1)[0] ?? 0));

  const mk = (id: string, label: string, layer: number, kind: TopoNode["kind"], baseRps: number, errRate: number, p95: number): TopoNode => {
    const l = live.get(id);
    return {
      id,
      label,
      layer,
      kind,
      rps: l ? Math.max(1, Math.round(l.count / 4)) : rpsOf(baseRps, id),
      errRate: l ? l.errRate : errRate,
      p95: l ? Math.round(l.p95) : p95,
    };
  };

  const nodes: TopoNode[] = [
    mk("cdn-edge", "cdn-edge", 0, "edge", 420, 0.1, 24),
    mk("api-gateway", "api-gateway", 1, "gateway", 380, 1.4, 88),
    mk("user-service", "user-service", 2, "service", 150, 2.1, 140),
    mk("order-service", "order-service", 2, "service", 120, 0.6, 110),
    mk("payment-service", "payment-service", 2, "service", 85, 6.2, 920),
    mk("notify-service", "notify-service", 2, "service", 45, 0.3, 65),
    mk("postgres-main", "postgres-main", 3, "datastore", 240, 0.4, 12),
    mk("redis-cache", "redis-cache", 3, "datastore", 310, 0.1, 3),
    mk("stripe-api", "api.stripe.com", 3, "external", 60, 3.8, 480),
    mk("sendgrid", "api.sendgrid.com", 3, "external", 30, 1.2, 210),
  ];

  const edges: TopoEdge[] = [
    { from: "cdn-edge", to: "api-gateway", volume: 1, errRate: 0.2 },
    { from: "api-gateway", to: "user-service", volume: 0.7, errRate: 2.1 },
    { from: "api-gateway", to: "order-service", volume: 0.55, errRate: 0.6 },
    { from: "api-gateway", to: "payment-service", volume: 0.4, errRate: 6.2 },
    { from: "api-gateway", to: "notify-service", volume: 0.2, errRate: 0.3 },
    { from: "user-service", to: "postgres-main", volume: 0.6, errRate: 0.4 },
    { from: "user-service", to: "redis-cache", volume: 0.8, errRate: 0.1 },
    { from: "order-service", to: "postgres-main", volume: 0.5, errRate: 0.5 },
    { from: "order-service", to: "redis-cache", volume: 0.4, errRate: 0.1 },
    { from: "payment-service", to: "postgres-main", volume: 0.3, errRate: 0.8 },
    { from: "payment-service", to: "stripe-api", volume: 0.35, errRate: 3.8 },
    { from: "notify-service", to: "sendgrid", volume: 0.18, errRate: 1.2 },
  ];

  return { nodes, edges };
}
