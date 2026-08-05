"use client";

const CATEGORIES = [
  { key: "피부과", color: "#2a78d6" },
  { key: "성형외과", color: "#eb6834" },
  { key: "약국", color: "#1baf7a" },
  { key: "대학/종합병원", color: "#eda100" },
  { key: "치과", color: "#e87ba4" },
  { key: "안과", color: "#008300" },
  { key: "한의학과", color: "#4a3aa7" },
  { key: "한약방", color: "#e34948" },
] as const;

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";
const GAP = 2;
const HEIGHT = 28;

export default function HorizontalShareBar({
  shares,
  title,
}: {
  shares: Record<string, number>;
  title: string;
}) {
  const present = CATEGORIES.map((c) => ({ ...c, v: shares[c.key] ?? 0 })).filter((c) => c.v > 0);
  const total = present.reduce((s, c) => s + c.v, 0) || 1;

  return (
    <div>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: INK, marginBottom: 6 }}>{title}</div>
      <div style={{ display: "flex", height: HEIGHT, borderRadius: 5, overflow: "hidden" }}>
        {present.map((c, i) => {
          const widthPct = (c.v / total) * 100;
          return (
            <div
              key={c.key}
              title={`${c.key} ${c.v.toFixed(1)}%`}
              style={{
                width: `calc(${widthPct}% - ${i < present.length - 1 ? GAP : 0}px)`,
                marginRight: i < present.length - 1 ? GAP : 0,
                background: c.color,
                minWidth: widthPct > 0.3 ? 2 : 0,
              }}
            />
          );
        })}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
        {present
          .slice()
          .sort((a, b) => b.v - a.v)
          .map((c) => (
            <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11 }}>
              <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color, display: "block" }} />
              <span style={{ color: MUTED }}>{c.key}</span>
              <span style={{ color: INK, fontWeight: 600 }}>{c.v.toFixed(1)}%</span>
            </span>
          ))}
      </div>
    </div>
  );
}

export function RegionButtons({
  regions,
  selected,
  onSelect,
}: {
  regions: string[];
  selected: string;
  onSelect: (r: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
      {regions.map((r) => {
        const on = r === selected;
        return (
          <button
            key={r}
            onClick={() => onSelect(r)}
            aria-pressed={on}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: `1px solid ${on ? INK : GRID}`,
              background: on ? INK : "#fff",
              color: on ? "#fff" : MUTED,
              cursor: "pointer",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              fontWeight: on ? 600 : 500,
            }}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
