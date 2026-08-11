"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";

export type NamedSeries = {
  label: string;
  color: string;
  points: { year: number; value: number }[];
};

const WIDTH = 720;
const HEIGHT = 340;
const MARGIN = { top: 20, right: 24, bottom: 46, left: 56 };

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";
const SURFACE = "#FBFBF8";

const fmtCompact = d3.format("~s");
const fmtFull = d3.format(",");

export default function MultiLineChart({
  series,
  years,
  defaultVisible,
  groupLabel = "국가",
  valueLabel = "외국인 환자 수 (명)",
  formatPeriod = (n: number) => `${n}년`,
  formatValue = fmtFull,
  axisLabel = "기준연도",
}: {
  series: NamedSeries[];
  years: number[];
  defaultVisible: string[];
  groupLabel?: string;
  valueLabel?: string;
  formatPeriod?: (n: number) => string;
  formatValue?: (n: number) => string;
  axisLabel?: string;
}) {
  const [visible, setVisible] = useState<Set<string>>(new Set(defaultVisible));
  const [hoverYear, setHoverYear] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  const innerW = WIDTH - MARGIN.left - MARGIN.right;
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom;

  const x = d3.scalePoint<number>().domain(years).range([0, innerW]).padding(0.5);

  const maxValue = useMemo(
    () => d3.max(series.flatMap((s) => s.points.map((p) => p.value))) ?? 0,
    [series]
  );
  const y = d3
    .scaleLinear()
    .domain([0, maxValue])
    .nice()
    .range([innerH, 0]);

  const line = d3
    .line<{ year: number; value: number }>()
    .x((d) => x(d.year) ?? 0)
    .y((d) => y(d.value))
    .curve(d3.curveMonotoneX);

  const yTicks = y.ticks(5);
  const visibleSeries = series.filter((s) => visible.has(s.label));

  // 월간처럼 구간이 길면(최대 102개월) x축 라벨이 전부 겹쳐 읽을 수 없다 — 일정 간격으로만
  // 라벨을 찍고(마지막은 항상 표시), 점이 너무 많으면 마커도 생략해 선만 남긴다.
  // 호버 히트영역과 툴팁은 모든 지점에 그대로 유지되므로 값 확인에는 영향이 없다.
  const labelStep = Math.max(1, Math.ceil(years.length / 14));
  const showDots = years.length <= 24;

  const toggle = (label: string) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });

  const hovered =
    hoverYear === null
      ? null
      : visibleSeries
          .map((s) => ({
            label: s.label,
            color: s.color,
            value: s.points.find((p) => p.year === hoverYear)?.value,
          }))
          .filter((r) => r.value !== undefined)
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {series.map((s) => {
          const on = visible.has(s.label);
          return (
            <button
              key={s.label}
              onClick={() => toggle(s.label)}
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

      <div style={{ position: "relative" }}>
        <svg
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          style={{ width: "100%", height: "auto", fontFamily: "ui-monospace, monospace" }}
          onMouseLeave={() => setHoverYear(null)}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {yTicks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={innerW} stroke={GRID} strokeWidth={1} />
                <text x={-10} dy="0.32em" textAnchor="end" fontSize={10} fill={MUTED}>
                  {fmtCompact(t)}
                </text>
              </g>
            ))}

            {years.map((yr, i) =>
              i % labelStep === 0 || i === years.length - 1 ? (
                <text
                  key={yr}
                  x={x(yr) ?? 0}
                  y={innerH + 20}
                  textAnchor="middle"
                  fontSize={10.5}
                  fill={MUTED}
                >
                  {formatPeriod(yr)}
                </text>
              ) : null
            )}

            {years.map((yr) => (
              <rect
                key={yr}
                x={(x(yr) ?? 0) - (x.step() / 2)}
                y={0}
                width={x.step()}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverYear(yr)}
              />
            ))}

            {hoverYear !== null && (
              <line
                x1={x(hoverYear) ?? 0}
                x2={x(hoverYear) ?? 0}
                y1={0}
                y2={innerH}
                stroke={MUTED}
                strokeWidth={1}
              />
            )}

            {visibleSeries.map((s) => (
              <path
                key={s.label}
                d={line(s.points) ?? ""}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ))}

            {showDots &&
              visibleSeries.map((s) =>
                s.points.map((p) => (
                  <circle
                    key={`${s.label}-${p.year}`}
                    cx={x(p.year) ?? 0}
                    cy={y(p.value)}
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
              {valueLabel}
            </text>
            <text x={innerW / 2} y={innerH + 40} textAnchor="middle" fontSize={11} fill={MUTED}>
              {axisLabel}
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
              minWidth: 140,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 4, color: INK }}>
              {hoverYear !== null ? formatPeriod(hoverYear) : ""}
            </div>
            {hovered.map((r) => (
              <div
                key={r.label}
                style={{ display: "flex", alignItems: "center", gap: 6, padding: "2px 0" }}
              >
                <span style={{ width: 10, height: 2, background: r.color, display: "block" }} />
                <span style={{ color: MUTED, flex: 1 }}>{r.label}</span>
                <span style={{ fontWeight: 700, color: INK }}>{formatValue(r.value ?? 0)}</span>
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
                  {groupLabel}
                </th>
                {years.map((yr) => (
                  <th
                    key={yr}
                    style={{ textAlign: "right", padding: "4px 10px", color: MUTED, borderBottom: `1px solid ${GRID}` }}
                  >
                    {formatPeriod(yr)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleSeries.map((s) => (
                <tr key={s.label}>
                  <td style={{ padding: "4px 10px", display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 8, background: s.color, display: "block" }} />
                    {s.label}
                  </td>
                  {years.map((yr) => (
                    <td key={yr} style={{ textAlign: "right", padding: "4px 10px", color: INK }}>
                      {formatValue(s.points.find((p) => p.year === yr)?.value ?? 0)}
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
