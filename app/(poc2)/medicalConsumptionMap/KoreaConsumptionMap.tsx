"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import { BASE, COAST_PATH, px, py } from "./koreaGeo";

export type RegionData = {
  short: string;
  full: string;
  lat: number;
  lng: number;
  byYear: Record<number, { count: number; amount: number }>;
};

type Metric = "count" | "amount";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const LAND = "#DDE3E8";
const LAND_EDGE = "#AEB9C4";

// dataviz 스킬: 규모 비교 → 순차(sequential) 단일 색상(blue), palette.md 100→700 스텝의 양끝
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

const fmtFull = d3.format(",");
const fmtCompact = d3.format("~s");

export default function KoreaConsumptionMap({
  regions,
  years,
  nationTotals,
}: {
  regions: RegionData[];
  years: number[];
  nationTotals: Record<number, { count: number; amount: number }>;
}) {
  const [yearIdx, setYearIdx] = useState(years.length - 1);
  const [metric, setMetric] = useState<Metric>("count");
  const [selected, setSelected] = useState<string | null>(null);

  const year = years[yearIdx];

  const rows = useMemo(
    () =>
      regions
        .map((r) => ({ ...r, value: r.byYear[year]?.[metric] ?? 0 }))
        .sort((a, b) => b.value - a.value),
    [regions, year, metric]
  );

  const maxValue = Math.max(...rows.map((r) => r.value), 1);
  const detail = rows.find((r) => r.short === selected) ?? rows[0];

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "center", marginBottom: 16 }}>
        <div style={{ flex: "1 1 260px", minWidth: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: MUTED, marginBottom: 4 }}>
            <span>기준연도</span>
            <span style={{ fontWeight: 700, color: INK }}>{year}</span>
          </div>
          <input
            type="range"
            min={0}
            max={years.length - 1}
            value={yearIdx}
            onChange={(e) => setYearIdx(Number(e.target.value))}
            style={{ width: "100%" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED }}>
            <span>{years[0]}</span>
            <span>{years[years.length - 1]}</span>
          </div>
        </div>

        <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
          {(["count", "amount"] as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: "6px 14px",
                border: "none",
                background: metric === m ? INK : "#fff",
                color: metric === m ? "#fff" : MUTED,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {m === "count" ? "소비건수" : "소비액"}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 11.5, color: MUTED }}>
          전국 합계 ·{" "}
          <span style={{ fontWeight: 700, color: INK }}>
            {fmtFull(nationTotals[year]?.[metric] ?? 0)}
            {metric === "count" ? "건" : "원"}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
        <div style={{ position: "relative", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 8 }}>
          <svg viewBox={`0 0 ${BASE.w} ${BASE.h}`} style={{ width: "100%", height: "auto", display: "block" }}>
            <path d={COAST_PATH} fill={LAND} stroke={LAND_EDGE} strokeWidth={0.8} strokeLinejoin="round" />
            <ellipse cx={px(126.55)} cy={py(33.38)} rx={32} ry={14} fill={LAND} stroke={LAND_EDGE} strokeWidth={0.8} />

            {rows.map((r) => {
              const rad = Math.max(4, Math.sqrt(r.value / maxValue) * 34);
              const active = r.short === selected;
              return (
                <g key={r.short} onClick={() => setSelected(r.short)} style={{ cursor: "pointer" }}>
                  <circle
                    cx={px(r.lng)}
                    cy={py(r.lat)}
                    r={rad}
                    fill={seqColor(r.value / maxValue)}
                    fillOpacity={0.85}
                    stroke={active ? INK : "#fff"}
                    strokeWidth={active ? 2 : 1}
                  >
                    <title>{`${r.full} · ${fmtFull(r.value)}${metric === "count" ? "건" : "원"}`}</title>
                  </circle>
                </g>
              );
            })}

            {rows.slice(0, 8).map((r) => (
              <text
                key={`t-${r.short}`}
                x={px(r.lng)}
                y={py(r.lat) - Math.max(4, Math.sqrt(r.value / maxValue) * 34) - 4}
                textAnchor="middle"
                fontSize={9.5}
                fontWeight={700}
                fill={INK}
                stroke="#fff"
                strokeWidth={2.4}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {r.short}
              </text>
            ))}
          </svg>

          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              background: "rgba(251,251,248,.92)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 10px",
            }}
          >
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: "0.08em", marginBottom: 5 }}>
              규모 (원 크기 · 색)
            </div>
            <div
              style={{
                width: 100,
                height: 8,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${SEQ_LOW}, ${SEQ_HIGH})`,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 3 }}>
              <span>낮음</span>
              <span>높음</span>
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.06em", marginBottom: 8 }}>
            순위 · {metric === "count" ? "소비건수" : "소비액"}
          </div>
          {rows.map((r, i) => (
            <div
              key={r.short}
              onClick={() => setSelected(r.short)}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                gap: 6,
                alignItems: "center",
                padding: "5px 4px",
                cursor: "pointer",
                borderLeft: r.short === selected ? `3px solid ${INK}` : "3px solid transparent",
                background: r.short === selected ? "#F3F2EC" : "transparent",
              }}
            >
              <span style={{ fontSize: 10, color: MUTED }}>{i + 1}</span>
              <span style={{ fontSize: 12 }}>{r.short}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{fmtCompact(r.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <div style={{ marginTop: 14, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: INK }}>{detail.full}</div>
          <div style={{ display: "flex", gap: 20, fontSize: 12.5 }}>
            <span style={{ color: MUTED }}>
              소비건수 <b style={{ color: INK }}>{fmtFull(detail.byYear[year]?.count ?? 0)}건</b>
            </span>
            <span style={{ color: MUTED }}>
              소비액 <b style={{ color: INK }}>{fmtFull(detail.byYear[year]?.amount ?? 0)}원</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
