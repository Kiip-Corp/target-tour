"use client";

import { useState } from "react";
import HorizontalShareBar, { RegionButtons } from "../RegionSpecialtyBar";

export type RegionShare = { region: string; count: Record<string, number>; amount: Record<string, number> };

type Period = "annual" | "monthly";

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";

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
              {p === "annual" ? "연간 누적 (2018–2026)" : "월간 누적 (2025)"}
            </button>
          ))}
        </div>
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
