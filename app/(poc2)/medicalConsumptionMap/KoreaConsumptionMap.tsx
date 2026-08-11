"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../../_koreaBubbleMap/KoreaBubbleMap";

export type RegionData = {
  short: string;
  full: string;
  code: string;
  byYear: Record<number, { count: number; amount: number }>;
};

type Metric = "count" | "amount";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

// dataviz 스킬: 규모 비교 → 순차(sequential) 단일 색상(blue), palette.md 100→700 스텝의 양끝
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

const MAP_W = 700;
const MAP_H = 910;

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
  const metricLabel = metric === "count" ? "소비건수" : "소비액";
  const unit = metric === "count" ? "건" : "원";

  const rows = useMemo(
    () =>
      regions
        .map((r) => ({ ...r, value: r.byYear[year]?.[metric] ?? 0 }))
        .sort((a, b) => b.value - a.value),
    [regions, year, metric]
  );

  const maxValue = Math.max(...rows.map((r) => r.value), 1);
  const detail = rows.find((r) => r.code === selected) ?? rows[0];

  // 시도 폴리곤 채우기 색은 선택한 연도·지표 기준으로 매 렌더 계산한다(연도 슬라이더가 움직이면 색도 같이 변함).
  const mapData: KoreaMapData = useMemo(
    () => ({
      sido: rows.map((r) => ({
        code: r.code,
        name: r.short,
        count: r.value,
        fill: seqColor(r.value / maxValue),
      })),
    }),
    [rows, maxValue]
  );

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
            {unit}
          </span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <KoreaBubbleMap
            data={mapData}
            width={MAP_W}
            height={MAP_H}
            showBubbles={false}
            // 5_연간 데이터는 시도 단위까지만 있어 서울을 확대해도 보여줄 구별 데이터가 없다.
            enableSeoulDrilldown={false}
            countLabel={metricLabel}
            countPostfix={unit}
            onSelect={setSelected}
            customTooltip={({ name, count }: TooltipProps) => (
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                <div style={{ color: MUTED }}>
                  {metricLabel}{" "}
                  <b style={{ color: INK }}>
                    {fmtFull(count)}
                    {unit}
                  </b>
                </div>
              </div>
            )}
          />

          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              background: "rgba(251,251,248,.92)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 10px",
              pointerEvents: "none",
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
            {year}년 · {metricLabel} 순위
          </div>
          {rows.map((r, i) => (
            <div
              key={r.code}
              onClick={() => setSelected(r.code)}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                gap: 6,
                alignItems: "center",
                padding: "5px 4px",
                cursor: "pointer",
                borderLeft: r.code === selected ? `3px solid ${INK}` : "3px solid transparent",
                background: r.code === selected ? "#F3F2EC" : "transparent",
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
