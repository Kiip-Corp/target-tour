"use client";

import * as d3 from "d3";
import { useState } from "react";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../koreaBubbleMap/KoreaBubbleMap";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const MAP_W = 700;
const MAP_H = 910;
const fmtVal = d3.format(".1f");

export default function TourismDrilldownBubbleMap({ data }: { data: KoreaMapData }) {
  const [level, setLevel] = useState<0 | 1 | 2>(0);

  return (
    <div style={{ position: "relative" }}>
      <KoreaBubbleMap
        data={data}
        width={MAP_W}
        height={MAP_H}
        enableGangnamDrilldown
        showBubbles={false}
        countLabel="지출액 비율"
        countPostfix="%"
        onLevelChange={setLevel}
        customTooltip={({ name, count }: TooltipProps) => (
          <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
            <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
            <div style={{ color: MUTED }}>
              지출액 비율 <b style={{ color: INK }}>{fmtVal(count)}%</b>
            </div>
          </div>
        )}
      />

      {level !== 2 && (
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
      )}
    </div>
  );
}
