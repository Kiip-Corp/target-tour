"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import { buildPeriodOptions } from "./periods";
import { CATEGORIES, type ShareMap, type SpecialtyData } from "./categories";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SURFACE = "#FBFBF8";

// 좌우 2단으로 배치하므로 한 장의 좌표계는 작게 잡는다(실제 크기는 부모 폭에 맞춰 늘어남).
const W = 420;
const H = 300;
const GAP = 2; // dataviz: 채움 사이 2px 표면색 간격

const fmt1 = d3.format(".1f");

type Metric = "amount" | "count";
const METRIC_LABEL: Record<Metric, string> = { amount: "소비액", count: "소비건수" };

type Node = { key: string; color: string; value: number; x0: number; y0: number; x1: number; y1: number };

function resolveShares(data: SpecialtyData, region: string, period: string, metric: Metric): ShareMap {
  if (region === "전국") {
    if (period === "all") return data.nationwide.snapshotAll[metric];
    if (period === "y2025") return data.nationwide.snapshot2025[metric];
    if (period.startsWith("year:")) return data.nationwide.byYear[period.slice(5)]?.[metric] ?? {};
    if (period.startsWith("month:")) return data.nationwide.byMonth[period.slice(6)]?.[metric] ?? {};
    return {};
  }
  const row = data.regions.find((r) => r.region === region);
  if (!row) return {};
  return period === "y2025" ? row.monthly[metric] : row.annual[metric];
}

function layout(shares: ShareMap): Node[] {
  const children = CATEGORIES.map((c) => ({ key: c.key, color: c.color, value: shares[c.key] ?? 0 })).filter(
    (c) => c.value > 0
  );
  if (children.length === 0) return [];
  const root = d3
    .hierarchy<{ key?: string; color?: string; value?: number; children?: typeof children }>({ children })
    .sum((d) => d.value ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  d3.treemap<(typeof root)["data"]>().size([W, H]).paddingInner(GAP).round(true)(root);
  return root.leaves().map((leaf) => {
    const l = leaf as d3.HierarchyRectangularNode<(typeof root)["data"]>;
    return {
      key: leaf.data.key as string,
      color: leaf.data.color as string,
      value: leaf.value ?? 0,
      x0: l.x0,
      y0: l.y0,
      x1: l.x1,
      y1: l.y1,
    };
  });
}

function TreemapPanel({
  metric,
  nodes,
  activeKey,
  onHover,
  onPin,
}: {
  metric: Metric;
  nodes: Node[];
  activeKey: string | null;
  onHover: (key: string | null, pos: { x: number; y: number } | null) => void;
  onPin: (key: string) => void;
}) {
  const ranked = [...nodes].sort((a, b) => b.value - a.value);
  const top = ranked[0];

  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, background: "#fff" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: INK }}>{METRIC_LABEL[metric]}</span>
        {top && (
          <span style={{ fontSize: 11, color: MUTED }}>
            1위 {top.key} {fmt1(top.value)}%
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => onHover(null, null)}
      >
        {nodes.map((n) => {
          const w = n.x1 - n.x0;
          const h = n.y1 - n.y0;
          const isActive = activeKey === n.key;
          const showName = w > 58 && h > 26;
          const showValue = w > 58 && h > 40;
          return (
            <g key={n.key}>
              <rect
                x={n.x0}
                y={n.y0}
                width={w}
                height={h}
                rx={3}
                fill={n.color}
                fillOpacity={activeKey && !isActive ? 0.4 : 1}
                stroke={isActive ? INK : SURFACE}
                strokeWidth={isActive ? 2 : 1}
                style={{ cursor: "pointer" }}
                onMouseEnter={(e) => {
                  const r = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  onHover(n.key, r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null);
                }}
                onMouseMove={(e) => {
                  const r = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
                  onHover(n.key, r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null);
                }}
                onClick={() => onPin(n.key)}
              />
              {showName && (
                <text x={n.x0 + 8} y={n.y0 + 18} pointerEvents="none" fill="#fff" fontWeight={700} fontSize={11.5}>
                  {n.key}
                </text>
              )}
              {showValue && (
                <text x={n.x0 + 8} y={n.y0 + 34} pointerEvents="none" fill="#fff" fontSize={11} fillOpacity={0.9}>
                  {fmt1(n.value)}%
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** 지역·기간은 두 패널이 공유하므로 페이지(BreakdownBoards)가 들고 있고, 여기는 받아 쓰기만 한다. */
export default function SpecialtyTreemap({
  data,
  region,
  period,
}: {
  data: SpecialtyData;
  region: string;
  period: string;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; metric: Metric } | null>(null);

  // 지역을 시도로 바꾸면 연도별·월별 옵션이 사라지므로, 없는 값이 남지 않게 렌더 시점에 보정한다.
  const periodOptions = useMemo(() => buildPeriodOptions(data, region), [data, region]);
  const effectivePeriod = periodOptions.some((o) => o.value === period) ? period : "all";

  const amountShares = resolveShares(data, region, effectivePeriod, "amount");
  const countShares = resolveShares(data, region, effectivePeriod, "count");

  const amountNodes = useMemo(() => layout(amountShares), [amountShares]);
  const countNodes = useMemo(() => layout(countShares), [countShares]);

  const activeKey = pinned ?? hovered;
  const rankOf = (nodes: Node[], key: string) =>
    [...nodes].sort((a, b) => b.value - a.value).findIndex((n) => n.key === key) + 1;

  const activeAmount = activeKey ? amountShares[activeKey] ?? 0 : 0;
  const activeCount = activeKey ? countShares[activeKey] ?? 0 : 0;
  const activeColor = activeKey ? CATEGORIES.find((c) => c.key === activeKey)?.color ?? INK : INK;
  const diff = activeAmount - activeCount;

  const periodLabel = periodOptions.find((o) => o.value === effectivePeriod)?.label ?? "";

  const handleHover = (metric: Metric) => (key: string | null, pos: { x: number; y: number } | null) => {
    setHovered(key);
    setTooltip(key && pos ? { ...pos, metric } : null);
  };

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ fontSize: 10.5, color: "#9AA1A9", textAlign: "right", marginBottom: 8 }}>
        사각형 클릭 → 아래에 고정 비교
      </div>

      {/* 소비액 · 소비건수를 좌우로 나란히 — 같은 과목이 양쪽에서 동시에 강조된다 */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <TreemapPanel
          metric="amount"
          nodes={amountNodes}
          activeKey={activeKey}
          onHover={handleHover("amount")}
          onPin={(k) => setPinned((p) => (p === k ? null : k))}
        />
        <TreemapPanel
          metric="count"
          nodes={countNodes}
          activeKey={activeKey}
          onHover={handleHover("count")}
          onPin={(k) => setPinned((p) => (p === k ? null : k))}
        />

        {hovered && tooltip && (
          <div
            style={{
              position: "absolute",
              left: `calc(${tooltip.metric === "amount" ? "0%" : "50%"} + ${tooltip.x + 14}px)`,
              top: tooltip.y + 52,
              pointerEvents: "none",
              background: "#fff",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              boxShadow: "0 2px 10px rgba(0,0,0,0.10)",
              padding: "8px 10px",
              fontSize: 12,
              zIndex: 3,
              whiteSpace: "nowrap",
            }}
          >
            <div style={{ fontWeight: 700, color: INK, marginBottom: 3 }}>{hovered}</div>
            <div style={{ color: MUTED }}>
              소비액 <b style={{ color: INK }}>{fmt1(amountShares[hovered] ?? 0)}%</b>
              {" · "}
              소비건수 <b style={{ color: INK }}>{fmt1(countShares[hovered] ?? 0)}%</b>
            </div>
          </div>
        )}
      </div>

      {/* 클릭 고정 상세 — 두 지표를 한 줄에서 직접 비교 */}
      <div
        style={{
          marginTop: 12,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          padding: 14,
          background: "#fff",
          minHeight: 96,
        }}
      >
        {activeKey ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
              <span style={{ width: 11, height: 11, borderRadius: 3, background: activeColor, display: "block" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: INK }}>{activeKey}</span>
              <span style={{ fontSize: 11, color: MUTED }}>
                · {region} · {periodLabel}
              </span>
              {pinned && (
                <button
                  onClick={() => setPinned(null)}
                  style={{
                    marginLeft: "auto",
                    border: "none",
                    background: "none",
                    color: MUTED,
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "ui-monospace, monospace",
                    textDecoration: "underline",
                  }}
                >
                  고정 해제
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {([
                ["amount", activeAmount, amountNodes] as const,
                ["count", activeCount, countNodes] as const,
              ]).map(([m, value, nodes]) => (
                <div key={m}>
                  <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.06em", marginBottom: 4 }}>
                    {METRIC_LABEL[m]} 전체 중
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: INK, lineHeight: 1.1 }}>
                      {fmt1(value)}%
                    </span>
                    <span style={{ fontSize: 11, color: MUTED }}>
                      {rankOf(nodes, activeKey)}위 / {nodes.length}개 과목
                    </span>
                  </div>
                  <div style={{ height: 8, background: "#F3F2EC", borderRadius: 4, overflow: "hidden", marginTop: 8 }}>
                    <div style={{ width: `${Math.min(value, 100)}%`, height: "100%", background: activeColor }} />
                  </div>
                </div>
              ))}
            </div>

            {Math.abs(diff) >= 5 && (
              <div style={{ marginTop: 12, fontSize: 11.5, color: MUTED, lineHeight: 1.6 }}>
                {diff > 0
                  ? `소비액 비중이 건수 비중보다 ${fmt1(diff)}%p 높습니다 — 방문 횟수 대비 건당 단가가 높은 과목입니다.`
                  : `건수 비중이 소비액 비중보다 ${fmt1(-diff)}%p 높습니다 — 자주 이용하지만 건당 단가는 낮은 과목입니다.`}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 12, color: MUTED, lineHeight: 1.7 }}>
            사각형에 마우스를 올리면 두 지표 비율이 함께 뜨고,{" "}
            <b style={{ color: INK }}>클릭하면 이 자리에 고정</b>돼 소비액·소비건수 순위까지 비교할 수 있습니다.
            같은 과목이 좌우 양쪽에서 동시에 강조됩니다.
          </div>
        )}
      </div>
    </div>
  );
}
