"use client";

import { useState } from "react";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";
import { RegionButtons } from "../RegionSpecialtyBar";

export type RegionSeries = {
  region: string;
  count: { series: NamedSeries[]; years: number[] };
  amount: { series: NamedSeries[]; years: number[] };
};

type Period = "annual" | "monthly";

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";

function formatAnnual(n: number) {
  return `${n}년`;
}
function formatMonthly(n: number) {
  const s = String(n);
  return `${s.slice(2, 4)}.${s.slice(4, 6)}`;
}

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
        <div style={{ display: "flex", border: `1px solid ${GRID}`, borderRadius: 8, overflow: "hidden", height: 30 }}>
          {(["annual", "monthly"] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                padding: "0 14px",
                border: "none",
                background: period === p ? INK : "#fff",
                color: period === p ? "#fff" : MUTED,
                cursor: "pointer",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {p === "annual" ? "연간 (2018–2026)" : "월간 (2025)"}
            </button>
          ))}
        </div>
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
