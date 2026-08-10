"use client";

import * as d3 from "d3";
import { useState } from "react";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Metric = "visit" | "spend";
type Period = "monthly" | "annual";

const fmtPct = d3.format(".1f");
const formatValue = (n: number) => `${fmtPct(n)}%`;

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

function ToggleGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "6px 14px",
            border: "none",
            background: value === o.value ? INK : "#fff",
            color: value === o.value ? "#fff" : MUTED,
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function SeasonalityChart({
  monthlyVisitSeries,
  monthlySpendSeries,
  annualVisitSeries,
  annualSpendSeries,
}: {
  monthlyVisitSeries: NamedSeries[];
  monthlySpendSeries: NamedSeries[];
  annualVisitSeries: NamedSeries[];
  annualSpendSeries: NamedSeries[];
}) {
  const [period, setPeriod] = useState<Period>("monthly");
  const [metric, setMetric] = useState<Metric>("visit");

  const seriesByPeriodMetric = {
    monthly: { visit: monthlyVisitSeries, spend: monthlySpendSeries },
    annual: { visit: annualVisitSeries, spend: annualSpendSeries },
  };
  const series = seriesByPeriodMetric[period][metric];
  const periodPoints = period === "monthly" ? MONTHS : YEARS;

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <ToggleGroup
          value={period}
          onChange={setPeriod}
          options={[
            { value: "monthly", label: "월간 기준" },
            { value: "annual", label: "연간 기준" },
          ]}
        />
        <ToggleGroup
          value={metric}
          onChange={setMetric}
          options={[
            { value: "visit", label: "방문자 비율" },
            { value: "spend", label: "관광소비 비율" },
          ]}
        />
      </div>
      <MultiLineChart
        key={period}
        series={series}
        years={periodPoints}
        defaultVisible={series.map((s) => s.label)}
        groupLabel="국가"
        valueLabel={metric === "visit" ? "서울 방문 외국인 중 비율(%)" : "서울 관광소비 중 비율(%)"}
        formatPeriod={(n) => (period === "monthly" ? `${n}월` : `${n}년`)}
        formatValue={formatValue}
        axisLabel={period === "monthly" ? "기준월(2025년)" : "기준연도"}
      />
    </div>
  );
}
