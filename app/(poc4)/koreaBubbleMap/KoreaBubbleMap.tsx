"use client";

// @tenqube/react-korea-bubble-map(0.0.4)를 이 프로젝트의 React 19 환경에 맞게 직접 포팅한 컴포넌트.
//
// 원본 라이브러리를 그대로 쓰지 않은 이유:
//  - 원본은 D3로 SVG를 직접 그리는 useEffect에 cleanup을 반환하지 않는다
//    (번들 소스: `return o((()=>{S()}),[l])` — S()의 결과를 return하지 않음).
//    Next.js는 next.config.ts에 reactStrictMode를 지정하지 않으면 App Router에서
//    기본값이 true라 개발 모드에서 모든 effect가 "마운트→cleanup→마운트"로 두 번 실행되는데,
//    cleanup이 없는 이 라이브러리는 두 번째 마운트에서 버블·지역·줌 리스너를 기존 것 위에
//    중복으로 그려버린다.
//  - 지역(sido) 채우기 색을 바꾸는 prop이 전혀 없다(#dbdce0 고정).
//  - peerDependencies는 react>=18이지만 실제 개발/테스트는 React 18(@types/react ^18.2.33)
//    기준이라 React 19에서 검증되지 않았고, 0.0.4로 README에도 "내부 개발/테스트 중"이라 명시.
//
// 이 포팅본은 원본이 내장했던 시도(sido)·서울 시군구(sigungu) 단위 topojson 지리 데이터
// (./sidoTopology.json, ./seoulGuTopology.json — 원출처: http://www.gisdeveloper.co.kr/?p=2332 ·
// https://github.com/southkorea/southkorea-maps, 원본 라이브러리는 MIT 라이선스)만 그대로
// 재사용하고, 렌더링은 D3로 DOM을 직접 조작하는 대신 React가 선언적으로 그리는 방식으로 새로
// 구현했다 — effect가 관리할 부수효과가 없으므로 StrictMode 이중 마운트에서도 중복 렌더링
// 문제가 구조적으로 발생하지 않는다.
// 원본은 전국 모든 시군구·읍면동을 담고 있지만, 이 프로젝트가 실제로 쓰는 건 "서울을 확대하면
// 서울 구단위로 들어가는" 2단계 드릴다운뿐이라 서울 25개 구만 추려서 포팅했다
// (app/(poc2)/tourismConsumptionMap/TourismDrilldownMap.tsx의 휠 줌 드릴다운과 같은 패턴).

import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useEffect, useMemo, useRef, useState } from "react";
import sidoTopologyRaw from "./sidoTopology.json";
import seoulGuTopologyRaw from "./seoulGuTopology.json";

export interface MapData {
  code: string;
  name: string;
  count: number;
  /** 원본에는 없는 확장: 지역(path) 채우기 색. 생략 시 기본 회색. */
  fill?: string;
}

export interface KoreaMapData {
  sido: MapData[];
  /** 서울을 확대했을 때 보여줄 서울 25개 구 데이터. 생략하면 기본 회색으로 이름만 표시. */
  sigungu?: MapData[];
  /** 이 포팅본에서는 읍면동 지리 데이터를 포팅하지 않아 렌더링에 쓰이지 않는다. */
  emd?: MapData[];
}

export interface TooltipProps {
  name: string;
  count: number;
  percent: number;
}

export interface BubbleMapConfigProps {
  width: number;
  height: number;
  data: KoreaMapData;
  countLabel?: string;
  countPostfix?: string;
  percentLabel?: string;
  customTooltip?(params: TooltipProps): React.ReactNode;
  /** 원본에는 없는 확장: 버블(원)을 그릴지 여부. 기본 true. */
  showBubbles?: boolean;
  /** 원본에는 없는 확장: 지역 클릭 콜백. */
  onSelect?(code: string): void;
}

const DEFAULT_REGION_FILL = "#dbdce0";
const REGION_STROKE = "#fff";
const BUBBLE_FILL = "#253FEB";
const INK = "#070707";
const MUTED = "#6B7280";
const BORDER = "#eef0f5";
const SEOUL_CODE = "1100000000";

type RegionProps = { CODE: string; ENG_NM: string; KOR_NM: string };

const sidoTopology = sidoTopologyRaw as unknown as Topology;
const SIDO_FEATURES = (
  feature(sidoTopology, sidoTopology.objects.sido as GeometryCollection) as FeatureCollection<
    Polygon | MultiPolygon,
    RegionProps
  >
).features;
const SEOUL_SIDO_FEATURE = SIDO_FEATURES.find((f) => f.properties.CODE === SEOUL_CODE) as Feature<
  Polygon | MultiPolygon,
  RegionProps
>;

const seoulGuTopology = seoulGuTopologyRaw as unknown as Topology;
const SEOUL_GU_FEATURES = (
  feature(seoulGuTopology, seoulGuTopology.objects.sigungu as GeometryCollection) as FeatureCollection<
    Polygon | MultiPolygon,
    RegionProps
  >
).features;

type Level = 0 | 1;

function bubbleRadius(count: number, max: number) {
  if (max <= 0 || count <= 0) return 0;
  const ratio = count / max;
  const raw = ratio < 0.1 ? 3 : 30 * ratio;
  return raw % 2 === 0 ? raw : raw + 1;
}

function buildRegions(
  features: Feature<Polygon | MultiPolygon, RegionProps>[],
  rows: MapData[],
  path: d3.GeoPath
) {
  const byCode = new Map(rows.map((r) => [r.code, r]));
  return features.map((f) => {
    const row = byCode.get(f.properties.CODE);
    const [cx, cy] = path.centroid(f);
    return {
      code: f.properties.CODE,
      name: row?.name ?? f.properties.KOR_NM,
      count: row?.count ?? 0,
      fill: row?.fill ?? DEFAULT_REGION_FILL,
      d: path(f) ?? "",
      cx,
      cy,
    };
  });
}

export function KoreaBubbleMap({
  width,
  height,
  data,
  countLabel = "인원",
  countPostfix = "명",
  percentLabel = "비율",
  customTooltip,
  showBubbles = true,
  onSelect,
}: BubbleMapConfigProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [level, setLevel] = useState<Level>(0);

  const FULL_VIEW = useMemo(() => ({ x: 0, y: 0, w: width, h: height }), [width, height]);
  const [view, setView] = useState(FULL_VIEW);
  const [prevResetKey, setPrevResetKey] = useState(`${width}x${height}x${level}`);
  const resetKey = `${width}x${height}x${level}`;
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    setView(FULL_VIEW);
  }
  const zoom = FULL_VIEW.w / view.w;
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const sidoProjection = useMemo(() => d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: SIDO_FEATURES }), [width, height]);
  const sidoPath = useMemo(() => d3.geoPath(sidoProjection), [sidoProjection]);
  const seoulGuProjection = useMemo(
    () => d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: SEOUL_GU_FEATURES }),
    [width, height]
  );
  const seoulGuPath = useMemo(() => d3.geoPath(seoulGuProjection), [seoulGuProjection]);

  const sidoRegions = useMemo(() => buildRegions(SIDO_FEATURES, data.sido, sidoPath), [data.sido, sidoPath]);
  const seoulGuRegions = useMemo(
    () => buildRegions(SEOUL_GU_FEATURES, data.sigungu ?? [], seoulGuPath),
    [data.sigungu, seoulGuPath]
  );
  const regions = level === 0 ? sidoRegions : seoulGuRegions;
  const activeRows = level === 0 ? data.sido : data.sigungu ?? [];
  const maxValue = Math.max(...activeRows.map((d) => d.count), 1);
  const totalCount = activeRows.reduce((sum, d) => sum + d.count, 0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const fx = (e.clientX - r.left) / r.width;
      const fy = (e.clientY - r.top) / r.height;
      const zoomingIn = e.deltaY < 0;
      const factor = zoomingIn ? 1.15 : 1 / 1.15;
      const v = viewRef.current;
      const sx = v.x + fx * v.w;
      const sy = v.y + fy * v.h;
      const newW = v.w / factor;

      if (level === 0 && zoomingIn && newW < width / 2.4) {
        const lonlat = sidoProjection.invert?.([sx, sy]);
        if (lonlat && d3.geoContains(SEOUL_SIDO_FEATURE, lonlat)) {
          setLevel(1);
          return;
        }
      }
      if (level === 1 && !zoomingIn && newW > width * 1.05) {
        setLevel(0);
        return;
      }

      const w = Math.min(width, Math.max(width / 8, newW));
      const h = w * (height / width);
      setView({ x: sx - fx * w, y: sy - fy * h, w, h });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [level, width, height, sidoProjection]);

  const hovered = hoveredCode ? regions.find((r) => r.code === hoveredCode) : null;

  const handleEnter = (code: string, e: React.MouseEvent) => {
    setHoveredCode(code);
    const r = containerRef.current?.getBoundingClientRect();
    if (r) setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const handleMove = (e: React.MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (r) setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top });
  };
  const handleClick = (code: string) => {
    if (level === 0 && code === SEOUL_CODE) {
      setLevel(1);
      return;
    }
    onSelect?.(code);
  };

  return (
    <div
      className="react-korea-bubble-map"
      style={{ width, fontFamily: "ui-monospace, monospace" }}
      onMouseLeave={() => setHoveredCode(null)}
    >
      {level === 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6, fontSize: 12 }}>
          <button
            onClick={() => setLevel(0)}
            style={{
              border: "none",
              background: "none",
              color: MUTED,
              cursor: "pointer",
              padding: 0,
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              textDecoration: "underline",
            }}
          >
            전국
          </button>
          <span style={{ color: "#C7C6BF" }}>›</span>
          <span style={{ color: INK, fontWeight: 600 }}>서울특별시</span>
        </div>
      )}
      <div ref={containerRef} style={{ position: "relative", width, height, overflow: "hidden", borderRadius: 20 }}>
        <svg viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`} width={width} height={height}>
          <g>
            {regions.map((r) => (
              <path
                key={r.code}
                d={r.d}
                fill={r.fill}
                stroke={REGION_STROKE}
                strokeWidth={0.5 / Math.max(zoom, 1)}
                onMouseEnter={(e) => handleEnter(r.code, e)}
                onMouseMove={handleMove}
                onClick={() => handleClick(r.code)}
                style={{ cursor: onSelect || (level === 0 && r.code === SEOUL_CODE) ? "pointer" : "default" }}
              />
            ))}
          </g>
          {showBubbles && (
            <g>
              {regions.map((r) => {
                const radius = bubbleRadius(r.count, maxValue) / Math.max(zoom, 1);
                if (radius <= 0) return null;
                const active = r.code === hoveredCode;
                return (
                  <circle
                    key={r.code}
                    cx={r.cx}
                    cy={r.cy}
                    r={radius}
                    fill={BUBBLE_FILL}
                    fillOpacity={active ? 1 : 0.3}
                    onMouseEnter={(e) => handleEnter(r.code, e)}
                    onMouseMove={handleMove}
                    onClick={() => handleClick(r.code)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {hovered && tooltipPos && (
          <div
            style={{
              position: "absolute",
              left: Math.min(tooltipPos.x + 14, width - 160),
              top: tooltipPos.y + 14,
              zIndex: 2,
              pointerEvents: "none",
              background: "#ffffff",
              borderRadius: 4,
              border: `1px solid ${BORDER}`,
              boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
              fontSize: 14,
              lineHeight: "18px",
              color: INK,
              padding: 16,
            }}
          >
            {customTooltip ? (
              customTooltip({
                name: hovered.name,
                count: hovered.count,
                percent: totalCount === 0 ? 0 : Math.floor((hovered.count / totalCount) * 100),
              })
            ) : (
              <>
                <strong style={{ display: "inline-block", fontWeight: 700, marginBottom: 8 }}>
                  {hovered.name}
                </strong>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 400, marginRight: 10 }}>{countLabel}</span>
                  <span>
                    {hovered.count}
                    {countPostfix}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: 400, marginRight: 10, color: MUTED }}>{percentLabel}</span>
                  <span>{totalCount === 0 ? 0 : Math.floor((hovered.count / totalCount) * 100)}%</span>
                </div>
              </>
            )}
          </div>
        )}

        {level === 0 && (
          <div
            style={{
              position: "absolute",
              top: 10,
              right: 10,
              fontSize: 9.5,
              color: MUTED,
              background: "rgba(255,255,255,.85)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "4px 8px",
              pointerEvents: "none",
            }}
          >
            서울 위에서 휠로 확대하면 구단위로 들어갑니다
          </div>
        )}
      </div>
    </div>
  );
}
