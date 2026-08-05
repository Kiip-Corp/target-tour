"use client";

import * as d3 from "d3";
import { useState } from "react";

export type Period = "annual" | "monthly";
export type ShareRow = { period: string; shares: Record<string, number> };

const CATEGORIES = [
  { key: "피부과", color: "#2a78d6" },
  { key: "성형외과", color: "#eb6834" },
  { key: "약국", color: "#1baf7a" },
  { key: "대학/종합병원", color: "#eda100" },
  { key: "치과", color: "#e87ba4" },
  { key: "안과", color: "#008300" },
  { key: "한의학과", color: "#4a3aa7" },
  { key: "한약방", color: "#e34948" },
] as const;

const WIDTH = 340;
const HEIGHT = 340;
const MARGIN = { top: 20, right: 12, bottom: 46, left: 40 };
const BAR_MAX = 24;
const GAP = 2;

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";

function periodLabel(p: string, period: Period) {
  if (period === "annual") return p;
  return `${p.slice(2, 4)}.${p.slice(4, 6)}`;
}

function Panel({
  title,
  rows,
  period,
  hoverIdx,
  onHover,
}: {
  title: string;
  rows: ShareRow[];
  period: Period;
  hoverIdx: number | null;
  onHover: (i: number | null) => void;
}) {
  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = d3
    .scaleBand<number>()
    .domain(rows.map((_, i) => i))
    .range([0, innerW])
    .padding(0.3);

  const y = d3.scaleLinear().domain([0, 100]).range([innerH, 0]);
  const barW = Math.min(BAR_MAX, x.bandwidth());
  const yTicks = [0, 25, 50, 75, 100];

  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>{title}</div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        style={{ width: "100%", height: "auto", fontFamily: "ui-monospace, monospace" }}
        onMouseLeave={() => onHover(null)}
      >
        <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
          {yTicks.map((t) => (
            <g key={t} transform={`translate(0,${y(t)})`}>
              <line x2={innerW} stroke={GRID} strokeWidth={1} />
              <text x={-8} dy="0.32em" textAnchor="end" fontSize={9.5} fill={MUTED}>
                {t}%
              </text>
            </g>
          ))}

          {rows.map((row, i) => {
            const cx = (x(i) ?? 0) + x.bandwidth() / 2 - barW / 2;
            let cumulative = 0;
            const active = hoverIdx === i;
            return (
              <g
                key={row.period}
                onMouseEnter={() => onHover(i)}
                style={{ cursor: "pointer" }}
                opacity={hoverIdx !== null && !active ? 0.55 : 1}
              >
                <rect x={cx} y={0} width={barW} height={innerH} fill="transparent" />
                {CATEGORIES.map((c, ci) => {
                  const v = row.shares[c.key] ?? 0;
                  const yTop = y(cumulative + v);
                  const yBottom = y(cumulative);
                  const h = Math.max(0, yBottom - yTop - (v > 0 ? GAP : 0));
                  cumulative += v;
                  if (h <= 0) return null;
                  const isTopSegment = ci === CATEGORIES.length - 1;
                  return (
                    <rect
                      key={c.key}
                      x={cx}
                      y={yTop}
                      width={barW}
                      height={h}
                      fill={c.color}
                      rx={isTopSegment ? 4 : 0}
                    />
                  );
                })}
              </g>
            );
          })}

          {rows.map((row, i) => (
            <text
              key={row.period}
              x={(x(i) ?? 0) + x.bandwidth() / 2}
              y={innerH + 16}
              textAnchor="middle"
              fontSize={9}
              fill={MUTED}
            >
              {periodLabel(row.period, period)}
            </text>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default function StackedShareChart({
  amountAnnual,
  amountMonthly,
  countAnnual,
  countMonthly,
}: {
  amountAnnual: ShareRow[];
  amountMonthly: ShareRow[];
  countAnnual: ShareRow[];
  countMonthly: ShareRow[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const amountRows = period === "annual" ? amountAnnual : amountMonthly;
  const countRows = period === "annual" ? countAnnual : countMonthly;
  const hoveredRow = hoverIdx !== null ? amountRows[hoverIdx] : null;
  const hoveredCountRow = hoverIdx !== null ? countRows[hoverIdx] : null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {CATEGORIES.map((c) => (
            <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color, display: "block" }} />
              <span style={{ color: MUTED }}>{c.key}</span>
            </span>
          ))}
        </div>

        <div style={{ display: "flex", border: `1px solid ${GRID}`, borderRadius: 8, overflow: "hidden" }}>
          {(["annual", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => {
                setPeriod(p);
                setHoverIdx(null);
              }}
              style={{
                padding: "6px 14px",
                border: "none",
                background: period === p ? INK : "#fff",
                color: period === p ? "#fff" : MUTED,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {p === "annual" ? "연간 (2018–2026)" : "월간 (2025)"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ position: "relative" }}>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
            <Panel
              title="소비금액 비율"
              rows={amountRows}
              period={period}
              hoverIdx={hoverIdx}
              onHover={setHoverIdx}
            />
          </div>
          <div style={{ flex: "1 1 300px", minWidth: 260 }}>
            <Panel
              title="소비건수 비율"
              rows={countRows}
              period={period}
              hoverIdx={hoverIdx}
              onHover={setHoverIdx}
            />
          </div>
        </div>

        {hoveredRow && (
          <div
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #E7E6E0",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              pointerEvents: "none",
              minWidth: 200,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: INK }}>
              {periodLabel(hoveredRow.period, period)}
            </div>
            {CATEGORIES.map((c) => (
              <div key={c.key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color, display: "block" }} />
                <span style={{ color: MUTED, flex: 1 }}>{c.key}</span>
                <span style={{ color: INK }}>{(hoveredRow.shares[c.key] ?? 0).toFixed(1)}%</span>
                <span style={{ color: MUTED, width: 46, textAlign: "right" }}>
                  {(hoveredCountRow?.shares[c.key] ?? 0).toFixed(1)}%
                </span>
              </div>
            ))}
            <div style={{ display: "flex", fontSize: 9.5, color: MUTED, marginTop: 4, paddingLeft: 14 }}>
              <span style={{ flex: 1 }} />
              <span style={{ width: 44, textAlign: "right" }}>금액</span>
              <span style={{ width: 46, textAlign: "right" }}>건수</span>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowTable((v) => !v)}
        style={{
          marginTop: 12,
          fontSize: 11.5,
          color: MUTED,
          background: "none",
          border: `1px solid ${GRID}`,
          borderRadius: 6,
          padding: "5px 10px",
          cursor: "pointer",
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {showTable ? "표 숨기기" : "표로 보기"}
      </button>

      {showTable && (
        <div style={{ overflowX: "auto", marginTop: 10 }}>
          {[
            { label: "소비금액 비율(%)", rows: amountRows },
            { label: "소비건수 비율(%)", rows: countRows },
          ].map((t) => (
            <table
              key={t.label}
              style={{
                borderCollapse: "collapse",
                fontSize: 11,
                fontFamily: "ui-monospace, monospace",
                minWidth: 480,
                marginBottom: 16,
              }}
            >
              <caption style={{ textAlign: "left", color: MUTED, marginBottom: 4, captionSide: "top" }}>
                {t.label}
              </caption>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "4px 8px", color: MUTED, borderBottom: `1px solid ${GRID}` }}>
                    진료과목
                  </th>
                  {t.rows.map((r) => (
                    <th
                      key={r.period}
                      style={{ textAlign: "right", padding: "4px 8px", color: MUTED, borderBottom: `1px solid ${GRID}` }}
                    >
                      {periodLabel(r.period, period)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map((c) => (
                  <tr key={c.key}>
                    <td style={{ padding: "4px 8px", display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color, display: "block" }} />
                      {c.key}
                    </td>
                    {t.rows.map((r) => (
                      <td key={r.period} style={{ textAlign: "right", padding: "4px 8px", color: INK }}>
                        {(r.shares[c.key] ?? 0).toFixed(1)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
      )}
    </div>
  );
}
