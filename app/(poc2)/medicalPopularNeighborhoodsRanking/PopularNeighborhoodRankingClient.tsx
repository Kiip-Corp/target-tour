"use client";

import { useState } from "react";
import NeighborhoodRankingTable from "../../_components/NeighborhoodRankingTable";
import { RegionButtons } from "../RegionSpecialtyBar";
import PeriodToggle, { formatAnnual, formatMonthly, type Period } from "../PeriodToggle";
import type { RegionSeries } from "../../_data/popularNeighborhoods";

export default function PopularNeighborhoodRankingClient({
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
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <RegionButtons regions={data.map((d) => d.region)} selected={region} onSelect={setRegion} />
        <PeriodToggle period={period} onChange={setPeriod} />
      </div>
      {current && (
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              {current.region} · 소비건수 비율 순위
            </div>
            <NeighborhoodRankingTable
              series={current.count.series}
              years={current.count.years}
              formatPeriod={formatPeriod}
            />
          </div>
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>
              {current.region} · 소비액 비율 순위
            </div>
            <NeighborhoodRankingTable
              series={current.amount.series}
              years={current.amount.years}
              formatPeriod={formatPeriod}
            />
          </div>
        </div>
      )}
    </div>
  );
}
