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
// 서울 구단위로 들어가는" 드릴다운뿐이라 서울 25개 구만 추려서 포팅했다
// (app/(poc2)/tourismConsumptionMap/TourismDrilldownMap.tsx의 휠 줌 드릴다운과 같은 패턴).
// 강남구 22개 행정동은 실제 경계 폴리곤이 없다(법정동 14개와 행정동 22개가 안 맞음, ./gangnamDong.ts
// 참고). 대신 22개 근사 좌표를 씨앗점으로 Voronoi 테셀레이션을 만들고, 강남구 실제 윤곽으로
// SVG clipPath 클리핑해서 "실측은 아니지만 근사 좌표를 반영한, 서로 겹치지 않는 구획"을 만든다
// — 경계가 정확하지 않다는 점은 페이지 설명에서 별도로 밝혀야 한다.
// enableGangnamDrilldown prop으로 켠 페이지에서만 서울→강남구 추가 드릴다운이 생긴다.

import * as d3 from "d3";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import sidoTopologyRaw from "./sidoTopology.json";
import seoulGuTopologyRaw from "./seoulGuTopology.json";
import { GANGNAM_CODE, GANGNAM_DONG } from "./gangnamDong";

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
  /** enableGangnamDrilldown일 때 강남구 22개 행정동 데이터. code는 동 이름과 일치해야 한다. */
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
  /** 원본에는 없는 확장: 서울→강남구 3단계 드릴다운을 켤지 여부. 기본 false. */
  enableGangnamDrilldown?: boolean;
  /** 원본에는 없는 확장: 현재 표시 중인 레벨(0=전국,1=서울,2=강남구)이 바뀔 때마다 호출된다. */
  onLevelChange?(level: 0 | 1 | 2): void;
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
const GANGNAM_GU_FEATURE = SEOUL_GU_FEATURES.find((f) => f.properties.CODE === GANGNAM_CODE) as Feature<
  Polygon | MultiPolygon,
  RegionProps
>;

type Level = 0 | 1 | 2;

function bubbleRadius(count: number, max: number) {
  if (max <= 0 || count <= 0) return 0;
  const ratio = count / max;
  const raw = ratio < 0.1 ? 3 : 30 * ratio;
  return raw % 2 === 0 ? raw : raw + 1;
}

// d3.geoPath()의 `d` 문자열 출력은 내부적으로 소수점 자리수가 이미 반올림돼 있어
// 서버(Node)와 브라우저의 삼각함수 구현이 마지막 몇 비트에서 갈려도 결과가 같지만,
// centroid()/투영 함수가 직접 반환하는 raw 좌표(cx/cy)는 반올림이 없어 그 차이가
// 그대로 드러난다 — 라벨 <text>의 x/y에 쓰면 SSR과 클라이언트 값이 미세하게 달라
// hydration mismatch 경고가 뜬다. 좌표를 소수 둘째 자리로 반올림해 직렬화를 맞춘다.
function round2(n: number) {
  return Math.round(n * 100) / 100;
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
      cx: round2(cx),
      cy: round2(cy),
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
  enableGangnamDrilldown = false,
  onLevelChange,
}: BubbleMapConfigProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; containerWidth: number } | null>(null);
  const [level, setLevel] = useState<Level>(0);
  useEffect(() => {
    onLevelChange?.(level);
  }, [level, onLevelChange]);

  const sidoProjection = useMemo(() => d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: SIDO_FEATURES }), [width, height]);
  const sidoPath = useMemo(() => d3.geoPath(sidoProjection), [sidoProjection]);
  const seoulGuProjection = useMemo(
    () => d3.geoMercator().fitSize([width, height], { type: "FeatureCollection", features: SEOUL_GU_FEATURES }),
    [width, height]
  );
  const seoulGuPath = useMemo(() => d3.geoPath(seoulGuProjection), [seoulGuProjection]);
  const gangnamDongProjection = useMemo(
    () => d3.geoMercator().fitSize([width, height], GANGNAM_GU_FEATURE),
    [width, height]
  );
  const gangnamDongPath = useMemo(() => d3.geoPath(gangnamDongProjection), [gangnamDongProjection]);
  const gangnamBackgroundD = useMemo(() => gangnamDongPath(GANGNAM_GU_FEATURE) ?? "", [gangnamDongPath]);
  const projectionByLevel = { 0: sidoProjection, 1: seoulGuProjection, 2: gangnamDongProjection } as const;

  const FULL_VIEW = useMemo(() => ({ x: 0, y: 0, w: width, h: height }), [width, height]);
  const [view, setView] = useState(FULL_VIEW);

  // 뷰(x,y,w,h)가 전체 지도 범위를 벗어나 빈 공간을 보여주지 않도록 드래그·휠 줌·레벨 전환 모두에 적용하는 클램프.
  const clampView = useCallback(
    (v: typeof FULL_VIEW) => {
      const maxX = Math.max(FULL_VIEW.x, FULL_VIEW.x + FULL_VIEW.w - v.w);
      const maxY = Math.max(FULL_VIEW.y, FULL_VIEW.y + FULL_VIEW.h - v.h);
      return {
        ...v,
        x: Math.min(Math.max(v.x, FULL_VIEW.x), maxX),
        y: Math.min(Math.max(v.y, FULL_VIEW.y), maxY),
      };
    },
    [FULL_VIEW]
  );

  // 레벨 전환 직전에 "어느 지점을, 얼마나 확대해서 보고 있었는지"를 잠깐 담아두는 곳.
  // 레벨마다 서로 다른 투영을 쓰기 때문에(서울은 전국보다 스케일이 약 15배 큼 — 서울만 같은
  // 캔버스에 꽉 채우니 당연함), 단순히 같은 픽셀 너비로 진입하면 실제로는 훨씬 좁은 지역을
  // 보여주게 되어 "갑자기 확 확대되는" 느낌을 준다. 대신 이전 레벨에서 보이던 실제 지리적
  // 범위를 스케일 비율로 환산해 다음 레벨에서도 같은 범위가 보이도록 한다.
  const [pendingFocus, setPendingFocus] = useState<{ lonlat: [number, number]; viewW: number; fromLevel: Level } | null>(
    null
  );
  const [prevResetKey, setPrevResetKey] = useState(`${width}x${height}x${level}`);
  const resetKey = `${width}x${height}x${level}`;
  if (prevResetKey !== resetKey) {
    setPrevResetKey(resetKey);
    if (pendingFocus) setPendingFocus(null);
    const newProjection = projectionByLevel[level];
    const focusPoint = pendingFocus && newProjection(pendingFocus.lonlat);
    if (focusPoint && pendingFocus) {
      const scaleRatio = newProjection.scale() / projectionByLevel[pendingFocus.fromLevel].scale();
      const w = Math.min(FULL_VIEW.w, Math.max(pendingFocus.viewW * scaleRatio, FULL_VIEW.w / 8));
      const h = w * (FULL_VIEW.h / FULL_VIEW.w);
      setView(clampView({ x: focusPoint[0] - w / 2, y: focusPoint[1] - h / 2, w, h }));
    } else {
      setView(FULL_VIEW);
    }
  }
  const zoom = FULL_VIEW.w / view.w;
  const viewRef = useRef(view);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  const [isPanning, setIsPanning] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startView: typeof FULL_VIEW;
  } | null>(null);
  const justDraggedRef = useRef(false);

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    // 전체 화면(zoom===1)일 땐 clampView가 이동을 (0,0)으로 그대로 되돌리므로 시각적으로는
    // no-op이지만, 제스처 자체를 조건부로 막지 않아야 zoom 계산 타이밍에 기대는 버그가 없다.
    e.currentTarget.setPointerCapture(e.pointerId);
    justDraggedRef.current = false;
    dragRef.current = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startView: viewRef.current };
    setIsPanning(true);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dxPx = e.clientX - d.startX;
    const dyPx = e.clientY - d.startY;
    if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) justDraggedRef.current = true;
    if (!justDraggedRef.current) return;
    const scaleX = d.startView.w / rect.width;
    const scaleY = d.startView.h / rect.height;
    setView(
      clampView({
        x: d.startView.x - dxPx * scaleX,
        y: d.startView.y - dyPx * scaleY,
        w: d.startView.w,
        h: d.startView.h,
      })
    );
  };
  const endPointerDrag = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId === e.pointerId) dragRef.current = null;
    setIsPanning(false);
  };

  const sidoRegions = useMemo(() => buildRegions(SIDO_FEATURES, data.sido, sidoPath), [data.sido, sidoPath]);
  const seoulGuRegions = useMemo(
    () => buildRegions(SEOUL_GU_FEATURES, data.sigungu ?? [], seoulGuPath),
    [data.sigungu, seoulGuPath]
  );
  // 실측 폴리곤이 없으니 22개 근사 좌표를 씨앗점으로 Voronoi 셀을 만든다. 렌더링 시 강남구
  // 실제 윤곽으로 clipPath 클리핑하면 서로 겹치지 않는 "구획"처럼 보이되, 경계 자체는 근사임을
  // 페이지에서 별도로 밝힌다.
  const gangnamDongRegions = useMemo(() => {
    const byName = new Map((data.emd ?? []).map((r) => [r.code, r]));
    const points: [number, number][] = GANGNAM_DONG.map((d) => {
      const [px, py] = gangnamDongProjection([d.lng, d.lat]) ?? [0, 0];
      return [round2(px), round2(py)];
    });
    const voronoi = d3.Delaunay.from(points).voronoi([0, 0, width, height]);
    return GANGNAM_DONG.map((d, i) => {
      const row = byName.get(d.name);
      const [cx, cy] = points[i];
      const cell = voronoi.cellPolygon(i);
      const cellD = cell ? `M${cell.map(([px, py]) => `${round2(px)},${round2(py)}`).join("L")}Z` : "";
      return {
        code: d.name,
        name: row?.name ?? d.name,
        count: row?.count ?? 0,
        fill: row?.fill ?? DEFAULT_REGION_FILL,
        d: cellD,
        cx,
        cy,
      };
    });
  }, [data.emd, gangnamDongProjection, width, height]);

  const regions = level === 0 ? sidoRegions : level === 1 ? seoulGuRegions : gangnamDongRegions;
  const activeRows = level === 0 ? data.sido : level === 1 ? data.sigungu ?? [] : data.emd ?? [];
  const maxValue = Math.max(...activeRows.map((d) => d.count), 1);
  const totalCount = activeRows.reduce((sum, d) => sum + d.count, 0);
  const clipIdBase = useId();
  const gangnamClipId = `gangnam-clip-${clipIdBase}`;

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
          setPendingFocus({ lonlat, viewW: newW, fromLevel: 0 });
          setLevel(1);
          return;
        }
      }
      if (level === 1 && zoomingIn && enableGangnamDrilldown && newW < width / 2.4) {
        const lonlat = seoulGuProjection.invert?.([sx, sy]);
        if (lonlat && d3.geoContains(GANGNAM_GU_FEATURE, lonlat)) {
          setPendingFocus({ lonlat, viewW: newW, fromLevel: 1 });
          setLevel(2);
          return;
        }
      }
      if (level === 1 && !zoomingIn && newW > width * 1.05) {
        const lonlat = seoulGuProjection.invert?.([sx, sy]);
        setPendingFocus(lonlat ? { lonlat, viewW: newW, fromLevel: 1 } : null);
        setLevel(0);
        return;
      }
      if (level === 2 && !zoomingIn && newW > width * 1.05) {
        const lonlat = gangnamDongProjection.invert?.([sx, sy]);
        setPendingFocus(lonlat ? { lonlat, viewW: newW, fromLevel: 2 } : null);
        setLevel(1);
        return;
      }

      const w = Math.min(width, Math.max(width / 8, newW));
      const h = w * (height / width);
      setView(clampView({ x: sx - fx * w, y: sy - fy * h, w, h }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [level, width, height, sidoProjection, seoulGuProjection, gangnamDongProjection, enableGangnamDrilldown, clampView]);

  const hovered = hoveredCode ? regions.find((r) => r.code === hoveredCode) : null;

  const handleEnter = (code: string, e: React.MouseEvent) => {
    setHoveredCode(code);
    const r = containerRef.current?.getBoundingClientRect();
    if (r) setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top, containerWidth: r.width });
  };
  const handleMove = (e: React.MouseEvent) => {
    const r = containerRef.current?.getBoundingClientRect();
    if (r) setTooltipPos({ x: e.clientX - r.left, y: e.clientY - r.top, containerWidth: r.width });
  };
  // 클릭한 지점을 다음 레벨의 초기 중심으로 그대로 이어가, 휠로 들어갈 때와 같은 방식으로 정렬한다.
  const enterChildLevel = (next: Level, e: React.MouseEvent, fromProjection: d3.GeoProjection) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const v = viewRef.current;
      const sx = v.x + ((e.clientX - rect.left) / rect.width) * v.w;
      const sy = v.y + ((e.clientY - rect.top) / rect.height) * v.h;
      const lonlat = fromProjection.invert?.([sx, sy]);
      setPendingFocus(lonlat ? { lonlat, viewW: v.w, fromLevel: level } : null);
    }
    setLevel(next);
  };

  const handleClick = (code: string, e: React.MouseEvent) => {
    if (justDraggedRef.current) return; // 드래그 끝의 합성 클릭은 무시
    if (level === 0 && code === SEOUL_CODE) {
      enterChildLevel(1, e, sidoProjection);
      return;
    }
    if (level === 1 && code === GANGNAM_CODE && enableGangnamDrilldown) {
      enterChildLevel(2, e, seoulGuProjection);
      return;
    }
    onSelect?.(code);
  };

  const BREADCRUMBS = [
    { label: "전국", level: 0 as Level },
    { label: "서울특별시", level: 1 as Level },
    { label: "강남구", level: 2 as Level },
  ].slice(0, level + 1);

  return (
    <div
      className="react-korea-bubble-map"
      style={{ width: "100%", fontFamily: "ui-monospace, monospace" }}
      onMouseLeave={() => setHoveredCode(null)}
    >
      <div
        ref={containerRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: `${width} / ${height}`,
          overflow: "hidden",
          borderRadius: 20,
        }}
      >
        {level > 0 && (
          <div
            style={{
              position: "absolute",
              top: 10,
              left: 10,
              zIndex: 2,
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              background: "rgba(255,255,255,.85)",
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "4px 8px",
            }}
          >
            {BREADCRUMBS.map((crumb, i) => (
              <span key={crumb.level} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: "#C7C6BF" }}>›</span>}
                {crumb.level === level ? (
                  <span style={{ color: INK, fontWeight: 600 }}>{crumb.label}</span>
                ) : (
                  <button
                    onClick={() => setLevel(crumb.level)}
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
                    {crumb.label}
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
        <svg
          viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
          width="100%"
          height="100%"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPointerDrag}
          onPointerCancel={endPointerDrag}
          style={{
            display: "block",
            touchAction: "none",
            cursor: zoom > 1 ? (isPanning ? "grabbing" : "grab") : "default",
          }}
        >
          {level === 2 && (
            <defs>
              <clipPath id={gangnamClipId}>
                <path d={gangnamBackgroundD} />
              </clipPath>
            </defs>
          )}
          <g clipPath={level === 2 ? `url(#${gangnamClipId})` : undefined}>
            {regions.map((r) => (
              <path
                key={r.code}
                d={r.d}
                fill={r.fill}
                stroke={REGION_STROKE}
                strokeWidth={0.5 / Math.max(zoom, 1)}
                onMouseEnter={(e) => handleEnter(r.code, e)}
                onMouseMove={handleMove}
                onClick={(e) => handleClick(r.code, e)}
                style={{
                  cursor:
                    onSelect ||
                    (level === 0 && r.code === SEOUL_CODE) ||
                    (level === 1 && r.code === GANGNAM_CODE && enableGangnamDrilldown)
                      ? "pointer"
                      : "default",
                }}
              />
            ))}
          </g>
          {level === 2 && (
            <path
              d={gangnamBackgroundD}
              fill="none"
              stroke={REGION_STROKE}
              strokeWidth={1.2 / Math.max(zoom, 1)}
              pointerEvents="none"
            />
          )}
          <g>
            {regions.map((r) => (
              <text
                key={`label-${r.code}`}
                x={r.cx}
                y={r.cy}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11 / Math.max(zoom, 1)}
                fontWeight={700}
                fill={INK}
                stroke="#fff"
                strokeWidth={3 / Math.max(zoom, 1)}
                paintOrder="stroke"
                pointerEvents="none"
              >
                {r.name}
              </text>
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
                    onClick={(e) => handleClick(r.code, e)}
                    style={{ cursor: "pointer" }}
                  />
                );
              })}
            </g>
          )}
        </svg>

        {hovered && tooltipPos && !isPanning && (
          <div
            style={{
              position: "absolute",
              left: Math.min(tooltipPos.x + 14, tooltipPos.containerWidth - 160),
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
          {level === 0 && "휠로 확대·축소, 드래그로 이동 · 서울 위에서 확대하면 구단위로 들어갑니다"}
          {level === 1 &&
            (enableGangnamDrilldown
              ? "휠로 확대·축소, 드래그로 이동 · 강남구 위에서 확대하면 동단위로 들어갑니다"
              : "휠로 확대·축소, 드래그로 이동 · 축소하면 전국으로 돌아갑니다")}
          {level === 2 && "휠로 확대·축소, 드래그로 이동 · 축소하면 서울로 돌아갑니다"}
        </div>
      </div>
    </div>
  );
}
