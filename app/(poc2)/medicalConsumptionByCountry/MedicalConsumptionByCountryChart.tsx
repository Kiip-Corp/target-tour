"use client";

import { useState } from "react";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Period = "annual" | "monthly";

export default function MedicalConsumptionByCountryChart({
  annualSeries,
  monthlySeries,
  years,
  months,
}: {
  annualSeries: NamedSeries[];
  monthlySeries: NamedSeries[];
  years: number[];
  months: number[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const series = period === "annual" ? annualSeries : monthlySeries;
  const periodPoints = period === "annual" ? years : months;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
          {(["annual", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
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
              {p === "annual" ? "연간 기준" : "월간 기준"}
            </button>
          ))}
        </div>
      </div>
      <MultiLineChart
        key={period}
        series={series}
        years={periodPoints}
        defaultVisible={series.map((s) => s.label)}
        groupLabel="국가"
        valueLabel="의료 소비액 (원)"
        formatPeriod={(n) => (period === "annual" ? `${n}년` : `${n}월`)}
        axisLabel={period === "annual" ? "기준연도" : "기준월(2025년)"}
      />
    </div>
  );
}
