"use client";

import { useState } from "react";
import MultiLineChart from "../../_components/MultiLineChart";
import { RegionButtons } from "../RegionSpecialtyBar";
import PeriodToggle, { formatAnnual, formatMonthly, type Period } from "../PeriodToggle";
import type { RegionSeries } from "../popularNeighborhoodsData";

export default function PopularNeighborhoodClient({
  annual,
  monthly,
}: {
  annual: RegionSeries[];
  monthly: RegionSeries[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const data = period === "annual" ? annual : monthly;
  const formatPeriod = period === "annual" ? formatAnnual : formatMonthly;

  const [region, setRegion] = useState(data[0]?.region ?? "");
  const current = data.find((d) => d.region === region) ?? data[0];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <RegionButtons regions={data.map((d) => d.region)} selected={region} onSelect={setRegion} />
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      {current && (
        <div style={{ display: "flex", flexDirection: "column", gap: 32, marginTop: 12 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              {current.region} · 소비건수 비율 상위 동네
            </div>
            <MultiLineChart
              key={`${region}-${period}-count`}
              series={current.count.series}
              years={current.count.years}
              defaultVisible={current.count.series.map((s) => s.label)}
              groupLabel="동네"
              valueLabel="소비건수 비율 (%)"
              formatPeriod={formatPeriod}
            />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              {current.region} · 소비액 비율 상위 동네
            </div>
            <MultiLineChart
              key={`${region}-${period}-amount`}
              series={current.amount.series}
              years={current.amount.years}
              defaultVisible={current.amount.series.map((s) => s.label)}
              groupLabel="동네"
              valueLabel="소비액 비율 (%)"
              formatPeriod={formatPeriod}
            />
          </div>
        </div>
      )}
    </div>
  );
}
