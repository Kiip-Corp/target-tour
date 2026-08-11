"use client";

import type { NamedSeries } from "../_components/MultiLineChart";

const INK = "#171A21";
const MUTED = "#6B7280";
const GRID = "#E7E6E0";

export default function NeighborhoodRankingTable({
  series,
  years,
  formatPeriod,
  unit = "%",
}: {
  series: NamedSeries[];
  years: number[];
  formatPeriod: (n: number) => string;
  unit?: string;
}) {
  const ranked = years.map((year, yi) =>
    series
      .map((s) => ({ label: s.label, color: s.color, value: s.points[yi]?.value ?? 0 }))
      .sort((a, b) => b.value - a.value)
  );
  const maxRank = Math.max(...ranked.map((r) => r.length), 0);

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          fontSize: 11.5,
          fontFamily: "ui-monospace, monospace",
          minWidth: 80 + years.length * 130,
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                textAlign: "left",
                padding: "6px 10px",
                color: MUTED,
                borderBottom: `1px solid ${GRID}`,
                position: "sticky",
                left: 0,
                background: "#fff",
              }}
            >
              순위
            </th>
            {years.map((yr) => (
              <th
                key={yr}
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  color: MUTED,
                  borderBottom: `1px solid ${GRID}`,
                  whiteSpace: "nowrap",
                }}
              >
                {formatPeriod(yr)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxRank }, (_, rank) => (
            <tr key={rank}>
              <td
                style={{
                  padding: "6px 10px",
                  color: MUTED,
                  fontWeight: 700,
                  borderBottom: `1px solid ${GRID}`,
                  position: "sticky",
                  left: 0,
                  background: "#fff",
                }}
              >
                {rank + 1}
              </td>
              {ranked.map((row, yi) => {
                const cell = row[rank];
                return (
                  <td
                    key={years[yi]}
                    style={{ padding: "6px 10px", borderBottom: `1px solid ${GRID}`, whiteSpace: "nowrap" }}
                  >
                    {cell ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 8,
                            background: cell.color,
                            display: "inline-block",
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: INK }}>{cell.label}</span>
                        <span style={{ color: MUTED }}>
                          {cell.value.toFixed(1)}
                          {unit}
                        </span>
                      </span>
                    ) : (
                      <span style={{ color: MUTED }}>—</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
