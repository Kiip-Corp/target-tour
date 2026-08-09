"use client";

import * as d3 from "d3";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BASE, COAST_PATH, GANGNAM_DONG, SEOUL_GU, px, py } from "./geo";

type Level = 0 | 1 | 2;
type Circle = { name: string; lat: number; lng: number; value: number };

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const LAND = "#DDE3E8";
const LAND_EDGE = "#AEB9C4";
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);
const fmtFull = d3.format(",.1f");

const ASPECT = BASE.h / BASE.w;
const MIN_W = BASE.w / 12;
const FULL_VIEW = { x: 0, y: 0, w: BASE.w, h: BASE.h };

function fitView(points: readonly { lat: number; lng: number }[], minW: number) {
  const xs = points.map((p) => px(p.lng));
  const ys = points.map((p) => py(p.lat));
  const pad = 30;
  const w = Math.max(Math.max(...xs) - Math.min(...xs) + pad * 2, minW);
  const h = w * ASPECT;
  return {
    x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2,
    y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2,
    w,
    h,
  };
}

const LEVEL_LABEL = ["전국", "서울특별시", "강남구"];

export default function TourismDrilldownMap({
  nation,
  seoul,
  gangnam,
}: {
  nation: Circle[];
  seoul: Circle[];
  gangnam: Circle[];
}) {
  const levelViews = useMemo(
    () => [FULL_VIEW, fitView(SEOUL_GU, BASE.w / 4), fitView(GANGNAM_DONG, BASE.w / 8)],
    []
  );

  const [level, setLevel] = useState<Level>(0);
  const [view, setView] = useState(FULL_VIEW);
  const [hovered, setHovered] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const data = level === 0 ? nation : level === 1 ? seoul : gangnam;
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  const enterLevel = useCallback((next: Level) => {
    setLevel(next);
    setView(levelViews[next]);
    setHovered(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clamp = useCallback(
    (v: typeof FULL_VIEW) => {
      const base = levelViews[level];
      const w = Math.min(base.w, Math.max(MIN_W, v.w));
      const h = w * ASPECT;
      return { w, h, x: v.x, y: v.y };
    },
    [level, levelViews]
  );

  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const zoomingIn = e.deltaY < 0;
      const factor = zoomingIn ? 1.15 : 1 / 1.15;

      setView((v) => {
        const sx = v.x + fx * v.w;
        const sy = v.y + fy * v.h;
        const newW = v.w / factor;

        // 계속 확대하면 다음 레벨로, 계속 축소하면 이전 레벨로 자연스럽게 넘어간다.
        if (zoomingIn && level < 2 && newW < levelViews[level].w / 2.4) {
          enterLevel((level + 1) as Level);
          return levelViews[level + 1];
        }
        if (!zoomingIn && level > 0 && newW > levelViews[level].w * 1.05) {
          enterLevel((level - 1) as Level);
          return levelViews[level - 1];
        }

        const w = Math.min(levelViews[level].w, Math.max(MIN_W, newW));
        const h = w * ASPECT;
        return clamp({ x: sx - fx * w, y: sy - fy * h, w, h });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  const zoom = levelViews[level].w / view.w;

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        {LEVEL_LABEL.map((label, i) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => enterLevel(i as Level)}
              disabled={i > level + 1}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: `1px solid ${i === level ? INK : BORDER}`,
                background: i === level ? INK : "#fff",
                color: i === level ? "#fff" : i <= level + 1 ? MUTED : "#C7C6BF",
                cursor: i <= level + 1 ? "pointer" : "default",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                fontWeight: i === level ? 600 : 500,
              }}
            >
              {label}
            </button>
            {i < 2 && <span style={{ color: "#C7C6BF" }}>›</span>}
          </div>
        ))}
        <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>
          휠로 확대하면 시→구→동 순으로 상세 지도로 들어갑니다
        </span>
      </div>

      <div style={{ position: "relative", border: `1px solid ${BORDER}`, borderRadius: 10, padding: 8 }}>
        <svg
          ref={svgRef}
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          className="tourism-map-svg"
          style={{ width: "100%", height: "auto", display: "block", touchAction: "none", cursor: "default" }}
        >
          <path d={COAST_PATH} fill={LAND} stroke={LAND_EDGE} strokeWidth={0.8 / Math.max(zoom, 1)} strokeLinejoin="round" />
          <ellipse
            cx={px(126.55)}
            cy={py(33.38)}
            rx={32}
            ry={14}
            fill={LAND}
            stroke={LAND_EDGE}
            strokeWidth={0.8 / Math.max(zoom, 1)}
          />

          {data.map((d) => {
            const rad = Math.max(3, Math.sqrt(d.value / maxValue) * 30) / Math.max(zoom, 1);
            const active = hovered === d.name;
            return (
              <g
                key={d.name}
                onMouseEnter={() => setHovered(d.name)}
                onMouseLeave={() => setHovered((h) => (h === d.name ? null : h))}
                onClick={() => {
                  if (level === 0 && d.name === "서울특별시") enterLevel(1);
                  if (level === 1 && d.name === "강남구") enterLevel(2);
                }}
                style={{
                  cursor:
                    (level === 0 && d.name === "서울특별시") || (level === 1 && d.name === "강남구")
                      ? "zoom-in"
                      : "default",
                }}
              >
                <circle
                  cx={px(d.lng)}
                  cy={py(d.lat)}
                  r={rad}
                  fill={seqColor(d.value / maxValue)}
                  fillOpacity={0.85}
                  stroke={active ? INK : "#fff"}
                  strokeWidth={(active ? 2 : 1) / Math.max(zoom, 1)}
                >
                  <title>{`${d.name} · 지출액 비율 ${fmtFull(d.value)}%`}</title>
                </circle>
                <text
                  x={px(d.lng)}
                  y={py(d.lat) - rad - 3 / Math.max(zoom, 1)}
                  textAnchor="middle"
                  fontSize={9.5 / Math.max(zoom, 1)}
                  fontWeight={700}
                  fill={INK}
                  stroke="#fff"
                  strokeWidth={2.4 / Math.max(zoom, 1)}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {d.name.replace("특별시", "").replace("광역시", "")}
                </text>
              </g>
            );
          })}
        </svg>

        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <button
            onClick={() => level < 2 && enterLevel((level + 1) as Level)}
            disabled={level === 2}
            title="확대(다음 레벨)"
            style={{
              width: 26,
              height: 26,
              border: `1px solid ${BORDER}`,
              background: "rgba(255,255,255,.92)",
              color: INK,
              fontSize: 13,
              borderRadius: 2,
              cursor: level === 2 ? "default" : "pointer",
              opacity: level === 2 ? 0.4 : 1,
            }}
          >
            ＋
          </button>
          <button
            onClick={() => level > 0 && enterLevel((level - 1) as Level)}
            disabled={level === 0}
            title="축소(이전 레벨)"
            style={{
              width: 26,
              height: 26,
              border: `1px solid ${BORDER}`,
              background: "rgba(255,255,255,.92)",
              color: INK,
              fontSize: 13,
              borderRadius: 2,
              cursor: level === 0 ? "default" : "pointer",
              opacity: level === 0 ? 0.4 : 1,
            }}
          >
            −
          </button>
        </div>

        <div
          style={{
            position: "absolute",
            left: 16,
            bottom: 16,
            background: "rgba(251,251,248,.92)",
            border: `1px solid ${BORDER}`,
            borderRadius: 8,
            padding: "8px 10px",
          }}
        >
          <div style={{ fontSize: 9, color: MUTED, letterSpacing: "0.08em", marginBottom: 5 }}>
            지출액 비율 (원 크기 · 색)
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
    </div>
  );
}
