"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";

export type Period = "annual" | "monthly";
export type RawPoint = { period: string; value: number };

const SERIES_DEFS = [
  { key: "count", label: "의료 소비건수", unit: "건", color: "#2a78d6" },
  { key: "amount", label: "의료 소비금액", unit: "원", color: "#eb6834" },
] as const;

const WIDTH = 720;
const HEIGHT = 340;
const MARGIN = { top: 20, right: 24, bottom: 46, left: 56 };

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";
const SURFACE = "#FBFBF8";

const fmtFull = d3.format(",");

function periodLabel(p: string, period: Period) {
  if (period === "annual") return p;
  return `${p.slice(2, 4)}.${p.slice(4, 6)}`;
}

export default function IndexedTrendChart({
  annual,
  monthly,
}: {
  annual: { count: RawPoint[]; amount: RawPoint[] };
  monthly: { count: RawPoint[]; amount: RawPoint[] };
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const [visible, setVisible] = useState<Set<string>>(
    new Set(SERIES_DEFS.map((s) => s.key))
  );
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const data = period === "annual" ? annual : monthly;
  const periods = data.count.map((p) => p.period);

  const indexed = useMemo(
    () =>
      SERIES_DEFS.map((def) => {
        const raw = data[def.key];
        const base = raw[0]?.value || 1;
        return {
          ...def,
          raw,
          points: raw.map((r, i) => ({ i, index: (r.value / base) * 100, value: r.value })),
        };
      }),
    [data]
  );

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = d3
    .scalePoint<number>()
    .domain(periods.map((_, i) => i))
    .range([0, innerW])
    .padding(0.5);

  const maxIndex = d3.max(indexed.flatMap((s) => s.points.map((p) => p.index))) ?? 100;
  const y = d3.scaleLinear().domain([0, maxIndex]).nice().range([innerH, 0]);

  const line = d3
    .line<{ i: number; index: number }>()
    .x((d) => x(d.i) ?? 0)
    .y((d) => y(d.index))
    .curve(d3.curveMonotoneX);

  const yTicks = y.ticks(5);
  const visibleSeries = indexed.filter((s) => visible.has(s.key));

  const toggle = (key: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const hovered =
    hoverIdx === null
      ? null
      : visibleSeries.map((s) => ({
          label: s.label,
          unit: s.unit,
          color: s.color,
          index: s.points[hoverIdx]?.index,
          value: s.points[hoverIdx]?.value,
        }));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6 }}>
          {SERIES_DEFS.map((s) => {
            const on = visible.has(s.key);
            return (
              <button
                key={s.key}
                onClick={() => toggle(s.key)}
                aria-pressed={on}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 20,
                  border: `1px solid ${on ? s.color : GRID}`,
                  background: on ? "#fff" : "#F3F2EC",
                  cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 8,
                    background: on ? s.color : "transparent",
                    border: `1.5px solid ${on ? s.color : MUTED}`,
                    display: "block",
                  }}
                />
                <span style={{ color: on ? INK : MUTED }}>{s.label}</span>
              </button>
            );
          })}
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
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", height: "auto", fontFamily: "ui-monospace, monospace" }}
          onMouseLeave={() => setHoverIdx(null)}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={innerW} stroke={GRID} strokeWidth={1} />
                <text x={-10} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
                  {t}
                </text>
              </g>
            ))}

            {periods.map((p, i) => (
              <text
                key={p}
                x={x(i) ?? 0}
                y={innerH + 20}
                textAnchor="middle"
                fontSize={10.5}
                fill={MUTED}
              >
                {periodLabel(p, period)}
              </text>
            ))}

            {periods.map((p, i) => (
              <rect
                key={p}
                x={(x(i) ?? 0) - x.step() / 2}
                y={0}
                width={x.step()}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIdx(i)}
              />
            ))}

            {hoverIdx !== null && (
              <line
                x1={x(hoverIdx) ?? 0}
                x2={x(hoverIdx) ?? 0}
                y1={0}
                y2={innerH}
                stroke={MUTED}
                strokeWidth={1}
              />
            )}

            {visibleSeries.map((s) => (
              <path
                key={s.key}
                d={line(s.points) ?? ""}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {visibleSeries.map((s) =>
              s.points.map((p) => (
                <circle
                  key={`${s.key}-${p.i}`}
                  cx={x(p.i) ?? 0}
                  cy={y(p.index)}
                  r={4}
                  fill={s.color}
                  stroke={SURFACE}
                  strokeWidth={2}
                />
              ))
            )}

            <text
              transform={`translate(-42,${innerH / 2}) rotate(-90)`}
              textAnchor="middle"
              fontSize={11}
              fill={MUTED}
            >
              지수 (첫 기간=100)
            </text>
            <text x={innerW / 2} y={innerH + 40} textAnchor="middle" fontSize={11} fill={MUTED}>
              {period === "annual" ? "기준연도" : "기준연월"}
            </text>
          </g>
        </svg>

        {hovered && hovered.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: 8,
              right: 8,
              background: "#fff",
              border: "1px solid #E7E6E0",
              borderRadius: 8,
              padding: "8px 10px",
              fontSize: 11.5,
              fontFamily: "ui-monospace, monospace",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
              pointerEvents: "none",
              minWidth: 200,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: INK }}>
              {hoverIdx !== null ? periodLabel(periods[hoverIdx], period) : ""}
            </div>
            {hovered.map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}>
                <span style={{ width: 10, height: 2, background: r.color, display: "block" }} />
                <span style={{ color: MUTED, flex: 1 }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: INK }}>
                  {fmtFull(r.value ?? 0)}
                  {r.unit}
                </span>
                <span style={{ color: MUTED }}>({(r.index ?? 0).toFixed(0)})</span>
              </div>
            ))}
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
          <table
            style={{
              borderCollapse: "collapse",
              fontSize: 11.5,
              fontFamily: "ui-monospace, monospace",
              minWidth: 480,
            }}
          >
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 10px", color: MUTED, borderBottom: `1px solid ${GRID}` }}>
                  지표
                </th>
                {periods.map((p) => (
                  <th
                    key={p}
                    style={{ textAlign: "right", padding: "4px 10px", color: MUTED, borderBottom: `1px solid ${GRID}` }}
                  >
                    {periodLabel(p, period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSeries.map((s) => (
                <tr key={s.key}>
                  <td style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: s.color, display: "block" }} />
                    {s.label}
                  </td>
                  {s.points.map((p, i) => (
                    <td key={periods[i]} style={{ textAlign: "right", padding: "4px 10px", color: INK }}>
                      {fmtFull(p.value)}
                      {s.unit}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
