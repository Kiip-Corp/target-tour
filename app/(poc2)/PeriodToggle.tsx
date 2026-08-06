"use client";

export type Period = "annual" | "monthly";

export function formatAnnual(n: number) {
  return `${n}년`;
}
export function formatMonthly(n: number) {
  const s = String(n);
  return `${s.slice(2, 4)}.${s.slice(4, 6)}`;
}

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";

export default function PeriodToggle({
  period,
  onChange,
  labels = ["연간 (2018–2026)", "월간 (2025)"],
}: {
  period: Period;
  onChange: (p: Period) => void;
  labels?: [string, string];
}) {
  return (
    <div style={{ display: "flex", border: `1px solid ${GRID}`, borderRadius: 8, overflow: "hidden", height: 30 }}>
      {(["annual", "monthly"] as Period[]).map((p, i) => (
        <button
          key={p}
          onClick={() => onChange(p)}
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
          {labels[i]}
        </button>
      ))}
    </div>
  );
}
