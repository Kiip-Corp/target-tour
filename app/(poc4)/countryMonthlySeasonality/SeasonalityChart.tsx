"use client";

import * as d3 from "d3";
import { useState } from "react";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Metric = "visit" | "spend";

const fmtPct = d3.format(".1f");
const formatValue = (n: number) => `${fmtPct(n)}%`;
const formatPeriod = (n: number) => `${n}월`;

export default function SeasonalityChart({
  visitSeries,
  spendSeries,
}: {
  visitSeries: NamedSeries[];
  spendSeries: NamedSeries[];
}) {
  const [metric, setMetric] = useState<Metric>("visit");
  const series = metric === "visit" ? visitSeries : spendSeries;

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
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
      <MultiLineChart
        series={series}
        years={Array.from({ length: 12 }, (_, i) => i + 1)}
        defaultVisible={series.map((s) => s.label)}
        groupLabel="국가"
        valueLabel={metric === "visit" ? "서울 방문 외국인 중 비율(%)" : "서울 관광소비 중 비율(%)"}
        formatPeriod={formatPeriod}
        formatValue={formatValue}
        axisLabel="기준월(2025년)"
      />
    </div>
  );
}
