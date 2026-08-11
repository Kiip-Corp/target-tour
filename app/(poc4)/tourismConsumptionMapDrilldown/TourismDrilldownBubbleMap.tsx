"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import { KoreaBubbleMap, type KoreaMapData, type MapData, type TooltipProps } from "../../_koreaBubbleMap/KoreaBubbleMap";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const MAP_W = 700;
const MAP_H = 910;
const fmtVal = d3.format(".1f");

const LEVEL_LABEL = ["전국", "서울특별시", "강남구"] as const;

export default function TourismDrilldownBubbleMap({ data }: { data: KoreaMapData }) {
  const [level, setLevel] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<string | null>(null);

  const rows = useMemo(() => {
    const activeRows: MapData[] = level === 0 ? data.sido : level === 1 ? data.sigungu ?? [] : data.emd ?? [];
    return [...activeRows].sort((a, b) => b.count - a.count);
  }, [level, data.sido, data.sigungu, data.emd]);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
        <div style={{ position: "relative" }}>
          <KoreaBubbleMap
            data={data}
            width={MAP_W}
            height={MAP_H}
            enableGangnamDrilldown
            showBubbles={false}
            countLabel="지출액 비율"
            countPostfix="%"
            onSelect={setSelected}
            onLevelChange={(l) => {
              setLevel(l);
              setSelected(null);
            }}
            customTooltip={({ name, count }: TooltipProps) => (
              <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                <div style={{ color: MUTED }}>
                  지출액 비율 <b style={{ color: INK }}>{fmtVal(count)}%</b>
                </div>
              </div>
            )}
          />

          <div
            style={{
              position: "absolute",
              left: 16,
              bottom: 16,
              background: "rgba(251,251,248,.92)",
              border: `1px solid ${BORDER}`,
              borderRadius: 8,
              padding: "8px 10px",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: 9, color: MUTED, letterSpacing: "0.08em", marginBottom: 5 }}>
              지출액 비율 (지역 색상)
            </div>
            <div
              style={{
                width: 100,
                height: 8,
                borderRadius: 4,
                background: `linear-gradient(90deg, ${SEQ_LOW}, ${SEQ_HIGH})`,
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: MUTED, marginTop: 3 }}>
              <span>낮음</span>
              <span>높음</span>
            </div>
          </div>
        </div>

        <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12 }}>
          <div style={{ fontSize: 11, color: MUTED, letterSpacing: "0.06em", marginBottom: 8 }}>
            {LEVEL_LABEL[level]} · 지출액 비율 순위
          </div>
          {rows.map((r, i) => (
            <div
              key={r.code}
              onClick={() => setSelected(r.code)}
              style={{
                display: "grid",
                gridTemplateColumns: "16px 1fr auto",
                gap: 6,
                alignItems: "center",
                padding: "5px 4px",
                cursor: "pointer",
                borderLeft: r.code === selected ? `3px solid ${INK}` : "3px solid transparent",
                background: r.code === selected ? "#F3F2EC" : "transparent",
              }}
            >
              <span style={{ fontSize: 10, color: MUTED }}>{i + 1}</span>
              <span style={{ fontSize: 12 }}>{r.name}</span>
              <span style={{ fontSize: 11, color: MUTED }}>{fmtVal(r.count)}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
