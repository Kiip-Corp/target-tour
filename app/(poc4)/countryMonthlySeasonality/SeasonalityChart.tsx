"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import MultiLineChart, { type NamedSeries } from "../../_components/MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Metric = "visit" | "spend";
type Period = "monthly" | "annual";

const fmtPct = d3.format(".1f");
const formatValue = (n: number) => `${fmtPct(n)}%`;

function formatYearMonth(ym: number) {
  const y = Math.floor(ym / 100);
  const m = ym % 100;
  return `${y}-${String(m).padStart(2, "0")}`;
}

function Select({
  value,
  onChange,
  options,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "5px 8px",
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        color: INK,
        background: "#fff",
        cursor: "pointer",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

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

  // 각 기간유형에서 실제로 존재하는 전체 구간(모든 국가 공통)을 데이터에서 직접 뽑는다 —
  // 셀렉트박스 옵션과 x축 도메인의 단일 출처(single source of truth)로 삼는다.
  const monthlyPoints = useMemo(() => monthlyVisitSeries[0]?.points.map((p) => p.year) ?? [], [monthlyVisitSeries]);
  const annualPoints = useMemo(() => annualVisitSeries[0]?.points.map((p) => p.year) ?? [], [annualVisitSeries]);
  const pointsByPeriod = { monthly: monthlyPoints, annual: annualPoints };
  const fullRange = pointsByPeriod[period];
  const minPoint = fullRange[0] ?? 0;
  const maxPoint = fullRange[fullRange.length - 1] ?? 0;

  const [monthlyStart, setMonthlyStart] = useState(monthlyPoints[0] ?? 0);
  const [monthlyEnd, setMonthlyEnd] = useState(monthlyPoints[monthlyPoints.length - 1] ?? 0);
  const [annualStart, setAnnualStart] = useState(annualPoints[0] ?? 0);
  const [annualEnd, setAnnualEnd] = useState(annualPoints[annualPoints.length - 1] ?? 0);
  const [start, end] = period === "monthly" ? [monthlyStart, monthlyEnd] : [annualStart, annualEnd];
  const setStart = period === "monthly" ? setMonthlyStart : setAnnualStart;
  const setEnd = period === "monthly" ? setMonthlyEnd : setAnnualEnd;

  const handleStart = (v: number) => {
    setStart(v);
    if (v > end) setEnd(v);
  };
  const handleEnd = (v: number) => {
    setEnd(v);
    if (v < start) setStart(v);
  };

  const seriesByPeriodMetric = {
    monthly: { visit: monthlyVisitSeries, spend: monthlySpendSeries },
    annual: { visit: annualVisitSeries, spend: annualSpendSeries },
  };
  const fullSeries = seriesByPeriodMetric[period][metric];
  const series = useMemo(
    () =>
      fullSeries.map((s) => ({
        ...s,
        points: s.points.filter((p) => p.year >= start && p.year <= end),
      })),
    [fullSeries, start, end]
  );
  const rangePoints = fullRange.filter((p) => p >= start && p <= end);

  const formatPeriod = (n: number) => (period === "monthly" ? formatYearMonth(n) : `${n}년`);
  const rangeOptions = fullRange.map((p) => ({ value: p, label: formatPeriod(p) }));

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
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 11, color: MUTED }}>기간</span>
          <Select value={start} onChange={handleStart} options={rangeOptions} />
          <span style={{ color: MUTED }}>~</span>
          <Select value={end} onChange={handleEnd} options={rangeOptions} />
        </div>
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
        key={`${period}-${start}-${end}`}
        series={series}
        years={rangePoints}
        defaultVisible={series.map((s) => s.label)}
        groupLabel="국가"
        valueLabel={metric === "visit" ? "서울 방문 외국인 중 비율(%)" : "서울 관광소비 중 비율(%)"}
        formatPeriod={formatPeriod}
        formatValue={formatValue}
        axisLabel={period === "monthly" ? `기준월 (${formatYearMonth(minPoint)} ~ ${formatYearMonth(maxPoint)} 중 선택)` : "기준연도"}
      />
    </div>
  );
}
