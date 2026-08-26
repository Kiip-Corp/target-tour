"use client";

import * as d3 from "d3";
import { useState } from "react";
import { CATEGORIES } from "../../specialtyTreemap/categories";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

const fmtPct = d3.format(".1f");

export type SpecialtyRow = {
  key: string;
  label: string;
  /** 진료과목 → 비율(%). 8개 합이 100이며, 값이 0인 과목은 키가 없을 수 있다. */
  shares: Record<string, number>;
  /** 우측에 함께 보여줄 절대값 문구(선택). */
  note?: string;
};

/**
 * 진료과목 구성 가로 100% 스택.
 *
 * 세로 스택 대신 가로로 놓는 이유: 여기서 축에 놓이는 건 기간이 아니라 국가·시도라
 * 한글 라벨이 17개까지 늘어난다. 세로축에 두면 라벨이 겹치거나 회전해야 한다.
 *
 * 팔레트는 앱 전체가 공유하는 CATEGORIES 8색 고정 순서를 그대로 쓴다(dataviz 검증 통과).
 * 다만 몇 색은 배경 대비 3:1을 밑돌아, 8% 이상 구간에는 값을 직접 찍고 표 보기를 함께 둔다.
 */
export default function SpecialtyBars({
  rows,
  metricLabel,
  highlight,
  onPick,
}: {
  rows: SpecialtyRow[];
  metricLabel: string;
  highlight?: string;
  onPick?: (key: string) => void;
}) {
  const [hover, setHover] = useState<{ row: string; cat: string; value: number } | null>(null);
  const [showTable, setShowTable] = useState(false);

  if (rows.length === 0) {
    return <div style={{ fontSize: 12, color: MUTED, padding: "10px 2px" }}>이 기간 자료가 없습니다.</div>;
  }

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, alignItems: "center" }}>
        {CATEGORIES.map((c) => (
          <span key={c.key} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5 }}>
            <span style={{ width: 8, height: 8, borderRadius: 8, background: c.color, display: "block" }} />
            <span style={{ color: MUTED }}>{c.key}</span>
          </span>
        ))}
        <button
          onClick={() => setShowTable((v) => !v)}
          style={{
            marginLeft: "auto",
            border: `1px solid ${BORDER}`,
            borderRadius: 6,
            background: "#fff",
            color: MUTED,
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            padding: "4px 10px",
          }}
        >
          {showTable ? "차트로 보기" : "표로 보기"}
        </button>
      </div>

      {showTable ? (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 8px", color: MUTED, fontWeight: 500 }}>구분</th>
                {CATEGORIES.map((c) => (
                  <th key={c.key} style={{ textAlign: "right", padding: "4px 8px", color: MUTED, fontWeight: 500 }}>
                    {c.key}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} style={{ borderTop: `1px solid ${BORDER}` }}>
                  <td style={{ padding: "4px 8px", color: INK, whiteSpace: "nowrap" }}>{r.label}</td>
                  {CATEGORIES.map((c) => (
                    <td key={c.key} style={{ padding: "4px 8px", textAlign: "right", color: MUTED }}>
                      {fmtPct(r.shares[c.key] ?? 0)}%
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          {rows.map((r) => {
            const on = highlight === r.key;
            return (
              <div
                key={r.key}
                onClick={onPick ? () => onPick(r.key) : undefined}
                style={{
                  display: "grid",
                  gridTemplateColumns: "62px 1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "3px 4px",
                  borderRadius: 4,
                  cursor: onPick ? "pointer" : "default",
                  background: on ? "#EEF4FD" : "transparent",
                }}
              >
                <span
                  style={{
                    fontSize: 11.5,
                    color: on ? INK : MUTED,
                    fontWeight: on ? 700 : 400,
                    textAlign: "right",
                    whiteSpace: "nowrap",
                  }}
                >
                  {r.label}
                </span>
                <div style={{ display: "flex", height: 22, borderRadius: 4, overflow: "hidden" }}>
                  {CATEGORIES.map((c) => {
                    const v = r.shares[c.key] ?? 0;
                    if (v <= 0) return null;
                    return (
                      <div
                        key={c.key}
                        onMouseEnter={() => setHover({ row: r.label, cat: c.key, value: v })}
                        onMouseLeave={() => setHover(null)}
                        style={{
                          width: `${v}%`,
                          background: c.color,
                          // 2px 흰 간격 — 인접 색이 CVD에서 붙어 보이는 걸 막는 보조 인코딩.
                          borderRight: "2px solid #fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          overflow: "hidden",
                        }}
                      >
                        {v >= 8 && (
                          <span style={{ fontSize: 10, color: "#fff", fontWeight: 600, whiteSpace: "nowrap" }}>
                            {Math.round(v)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <span style={{ fontSize: 11, color: MUTED, whiteSpace: "nowrap" }}>{r.note ?? ""}</span>
              </div>
            );
          })}

          {hover && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: -34,
                background: "#fff",
                border: `1px solid ${BORDER}`,
                borderRadius: 8,
                padding: "6px 10px",
                fontSize: 11.5,
                color: MUTED,
                pointerEvents: "none",
                boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
              }}
            >
              <b style={{ color: INK }}>{hover.row}</b> · {hover.cat} {metricLabel}{" "}
              <b style={{ color: INK }}>{fmtPct(hover.value)}%</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
