"use client";

import { useMemo, useState } from "react";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Period = "annual" | "monthly";

function Select({
  value,
  onChange,
  options,
  disabled = false,
  ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  options: { value: number; label: string }[];
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <select
      aria-label={ariaLabel}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "5px 8px",
        fontFamily: "ui-monospace, monospace",
        fontSize: 12,
        color: disabled ? "#B6BAC0" : INK,
        background: disabled ? "#F3F2EC" : "#fff",
        cursor: disabled ? "not-allowed" : "pointer",
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

export default function MedicalConsumptionByCountryChart({
  annualSeries,
  monthlySeries,
  years,
  yearMonths,
}: {
  annualSeries: NamedSeries[];
  monthlySeries: NamedSeries[];
  years: number[];
  /** 월간 x축 키(YYYYMM) 전체 목록. 연·월 셀렉트 옵션도 여기서 파생된다. */
  yearMonths: number[];
}) {
  const [period, setPeriod] = useState<Period>("annual");

  // 연간은 연도, 월간은 YYYYMM 하나로 시작·종료를 들고 있는다 — 연·월 셀렉트 두 개가
  // 사실상 하나의 시점을 가리키므로 상태를 쪼개지 않는 편이 정합성 맞추기 쉽다.
  const [annualStart, setAnnualStart] = useState(years[0] ?? 0);
  const [annualEnd, setAnnualEnd] = useState(years[years.length - 1] ?? 0);
  const [monthlyStart, setMonthlyStart] = useState(yearMonths[0] ?? 0);
  const [monthlyEnd, setMonthlyEnd] = useState(yearMonths[yearMonths.length - 1] ?? 0);

  // 월간 데이터에 실제로 존재하는 "연도 → 월 목록" (2026년은 1~6월만 있는 식이라 하드코딩하지 않는다).
  const monthsByYear = useMemo(() => {
    const map = new Map<number, number[]>();
    for (const ym of yearMonths) {
      const y = Math.floor(ym / 100);
      map.set(y, [...(map.get(y) ?? []), ym % 100]);
    }
    return map;
  }, [yearMonths]);
  const monthlyYears = useMemo(() => [...monthsByYear.keys()].sort((a, b) => a - b), [monthsByYear]);

  // 연도를 바꿨을 때 그 해에 없는 달(예: 2026년 12월)이 남지 않도록 보정한다.
  const clampYM = (year: number, month: number) => {
    const months = monthsByYear.get(year) ?? [];
    return year * 100 + (months.includes(month) ? month : months[months.length - 1] ?? 1);
  };

  const setStart = (v: number) => {
    if (period === "annual") {
      setAnnualStart(v);
      if (v > annualEnd) setAnnualEnd(v);
    } else {
      setMonthlyStart(v);
      if (v > monthlyEnd) setMonthlyEnd(v);
    }
  };
  const setEnd = (v: number) => {
    if (period === "annual") {
      setAnnualEnd(v);
      if (v < annualStart) setAnnualStart(v);
    } else {
      setMonthlyEnd(v);
      if (v < monthlyStart) setMonthlyStart(v);
    }
  };

  const isAnnual = period === "annual";
  const startKey = isAnnual ? annualStart : monthlyStart;
  const endKey = isAnnual ? annualEnd : monthlyEnd;

  const startYear = isAnnual ? annualStart : Math.floor(monthlyStart / 100);
  const endYear = isAnnual ? annualEnd : Math.floor(monthlyEnd / 100);
  const startMonth = monthlyStart % 100;
  const endMonth = monthlyEnd % 100;

  const yearOptions = (isAnnual ? years : monthlyYears).map((y) => ({ value: y, label: `${y}년` }));
  const monthOptionsFor = (year: number) =>
    (monthsByYear.get(year) ?? []).map((m) => ({ value: m, label: `${m}월` }));

  const fullSeries = isAnnual ? annualSeries : monthlySeries;
  const series = useMemo(
    () =>
      fullSeries.map((s) => ({
        ...s,
        points: s.points.filter((p) => p.year >= startKey && p.year <= endKey),
      })),
    [fullSeries, startKey, endKey]
  );
  const rangePoints = (isAnnual ? years : yearMonths).filter((p) => p >= startKey && p <= endKey);

  const formatPeriod = (n: number) =>
    isAnnual ? `${n}년` : `${Math.floor(n / 100)}-${String(n % 100).padStart(2, "0")}`;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: MUTED, marginRight: 2 }}>조회 기간</span>
        <Select
          ariaLabel="기간 유형"
          value={isAnnual ? 0 : 1}
          onChange={(v) => setPeriod(v === 0 ? "annual" : "monthly")}
          options={[
            { value: 0, label: "연간" },
            { value: 1, label: "월간" },
          ]}
        />

        <Select
          ariaLabel="시작 연도"
          value={startYear}
          onChange={(y) => setStart(isAnnual ? y : clampYM(y, startMonth))}
          options={yearOptions}
        />
        <Select
          ariaLabel="시작 월"
          value={isAnnual ? 1 : startMonth}
          onChange={(m) => setStart(clampYM(startYear, m))}
          disabled={isAnnual}
          options={isAnnual ? [{ value: 1, label: "—" }] : monthOptionsFor(startYear)}
        />
        <span style={{ fontSize: 11, color: MUTED }}>부터</span>

        <Select
          ariaLabel="종료 연도"
          value={endYear}
          onChange={(y) => setEnd(isAnnual ? y : clampYM(y, endMonth))}
          options={yearOptions}
        />
        <Select
          ariaLabel="종료 월"
          value={isAnnual ? 1 : endMonth}
          onChange={(m) => setEnd(clampYM(endYear, m))}
          disabled={isAnnual}
          options={isAnnual ? [{ value: 1, label: "—" }] : monthOptionsFor(endYear)}
        />
        <span style={{ fontSize: 11, color: MUTED }}>까지</span>

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 4 }}>
          ({rangePoints.length}개 {isAnnual ? "연도" : "개월"})
        </span>
      </div>
      <MultiLineChart
        key={`${period}-${startKey}-${endKey}`}
        series={series}
        years={rangePoints}
        defaultVisible={series.map((s) => s.label)}
        groupLabel="국가"
        valueLabel="의료 소비액 (원)"
        formatPeriod={formatPeriod}
        axisLabel={isAnnual ? "기준연도" : "기준연월"}
      />
    </div>
  );
}
