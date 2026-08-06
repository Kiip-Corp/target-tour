"use client";

import { useState } from "react";
import HorizontalShareBar, { RegionButtons } from "../RegionSpecialtyBar";
import PeriodToggle, { type Period } from "../PeriodToggle";

export type RegionShare = { region: string; count: Record<string, number>; amount: Record<string, number> };

export default function RegionSpecialtyClient({
  annual,
  monthly,
}: {
  annual: RegionShare[];
  monthly: RegionShare[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  const data = period === "annual" ? annual : monthly;

  const [region, setRegion] = useState(data[0]?.region ?? "");
  const current = data.find((d) => d.region === region) ?? data[0];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 6 }}>
        <RegionButtons regions={data.map((d) => d.region)} selected={region} onSelect={setRegion} />
        <PeriodToggle
          period={period}
          onChange={setPeriod}
          labels={["연간 누적 (2018–2026)", "월간 누적 (2025)"]}
        />
      </div>
      {current && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24, marginTop: 12 }}>
          <HorizontalShareBar
            key={`${region}-${period}-count`}
            title={`${current.region} · 소비건수 비율`}
            shares={current.count}
          />
          <HorizontalShareBar
            key={`${region}-${period}-amount`}
            title={`${current.region} · 소비액 비율`}
            shares={current.amount}
          />
        </div>
      )}
    </div>
  );
}
