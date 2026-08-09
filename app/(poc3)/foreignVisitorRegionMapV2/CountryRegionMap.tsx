"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import { KOREA_VIEW_BOX, REGIONS } from "./koreaSvgMap";

export type RegionRow = { region: string; short: string; visit: number; spend: number };
export type CountryData = { country: string; rows: RegionRow[] };

type Metric = "visit" | "spend";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);
const fmtVal = d3.format(".1f");

export default function CountryRegionMap({ data }: { data: CountryData[] }) {
  const [country, setCountry] = useState(data[0]?.country ?? "");
  const [metric, setMetric] = useState<Metric>("visit");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const current = data.find((d) => d.country === country) ?? data[0];
  const metricLabel = metric === "visit" ? "방문자 비율" : "관광소비 비율";

  const rows = useMemo(
    () => (current ? [...current.rows].sort((a, b) => b[metric] - a[metric]) : []),
    [current, metric]
  );
  const byShort = useMemo(() => new Map(rows.map((r) => [r.short, r])), [rows]);
  const maxValue = Math.max(...rows.map((r) => r[metric]), 1);
  const detail = rows.find((r) => r.short === selected) ?? rows[0];
  const hoveredRow = hovered ? byShort.get(hovered) : null;

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {data.map((d) => {
            const on = d.country === country;
            return (
              <button
                key={d.country}
                onClick={() => {
                  setCountry(d.country);
                  setSelected(null);
                }}
                aria-pressed={on}
                style={{
                  padding: "5px 14px",
                  borderRadius: 20,
                  border: `1px solid ${on ? INK : BORDER}`,
                  background: on ? INK : "#fff",
                  color: on ? "#fff" : MUTED,
                  cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  fontSize: 12,
                  fontWeight: on ? 600 : 500,
                }}
              >
                {d.country}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
          {(["visit", "spend"] as Metric[]).map((m) => (
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
              {m === "visit" ? "방문자 비율" : "관광소비 비율"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
        <div style={{ position: "relative", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 8 }}>
          <svg
            viewBox={KOREA_VIEW_BOX}
            style={{ width: "100%", height: "auto", display: "block" }}
            onMouseLeave={() => setHovered(null)}
          >
            {REGIONS.map((reg) => {
              const row = byShort.get(reg.short);
              const v = row ? row[metric] : 0;
              const active = reg.short === hovered || reg.short === selected;
              return (
                <path
                  key={reg.id}
                  d={reg.path}
                  fill={seqColor(v / maxValue)}
                  stroke={active ? INK : "#fff"}
                  strokeWidth={active ? 1.6 : 1}
                  strokeLinejoin="round"
                  onMouseEnter={() => setHovered(reg.short)}
                  onClick={() => setSelected(reg.short)}
                  style={{ cursor: "pointer" }}
                />
              );
            })}
          </svg>

          {hoveredRow && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "rgba(251,251,248,.96)",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "8px 10px",
                pointerEvents: "none",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 12, color: INK, marginBottom: 2 }}>{hoveredRow.region}</div>
              <div style={{ fontSize: 11, color: MUTED }}>
                {metricLabel} <b style={{ color: INK }}>{fmtVal(hoveredRow[metric])}%</b>
              </div>
            </div>
          )}

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
              {metricLabel} (지역 색상)
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
            {current?.country} · {metricLabel} 순위
          </div>
          {rows.map((r, i) => (
            <div
              key={r.short}
              onClick={() => setSelected(r.short)}
              onMouseEnter={() => setHovered(r.short)}
              onMouseLeave={() => setHovered(null)}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                gap: 6,
                alignItems: "center",
                padding: "5px 4px",
                cursor: "pointer",
                borderLeft: r.short === selected ? `3px solid ${INK}` : "3px solid transparent",
                background: r.short === selected || r.short === hovered ? "#F3F2EC" : "transparent",
              }}
            >
              <span style={{ fontSize: 10, color: MUTED }}>{i + 1}</span>
              <span style={{ fontSize: 12 }}>{r.short}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{fmtVal(r[metric])}%</span>
            </div>
          ))}
        </div>
      </div>

      {detail && (
        <div style={{ marginTop: 14, border: `1px solid ${BORDER}`, borderRadius: 10, padding: 14 }}>
          <div style={{ fontWeight: 700, marginBottom: 6, color: INK }}>{detail.region}</div>
          <div style={{ display: "flex", gap: 20, fontSize: 12.5 }}>
            <span style={{ color: MUTED }}>
              방문자 비율 <b style={{ color: INK }}>{fmtVal(detail.visit)}%</b>
            </span>
            <span style={{ color: MUTED }}>
              관광소비 비율 <b style={{ color: INK }}>{fmtVal(detail.spend)}%</b>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
