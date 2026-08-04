"use client";

import React, { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { AGES, COAST, COUNTRIES, MONTHS, SGG, SIDO, compute } from "./data";
import { C, CSS, MONO, SANS, lqColor } from "./styles";

/* ============================================================================
 *  iipuda · 외국인 밀집 지역 스캐너
 *  오프라인 채널(약국·드럭스토어·제휴 클리닉) 배치 판단용 내부 도구
 *
 *  목업 데이터·추정 모델·API 연동 지점 → ./data.js
 *  팔레트·타이포·전역 CSS            → ./styles.js
 * ==========================================================================*/

/* -------------------------------------------------------------- 지도 투영 */
const LNG0 = 125.6, LAT1 = 38.75, KM_LAT = 111, KM_LNG = 89.8, K = 0.9245;
const px = (lng) => 8 + (lng - LNG0) * KM_LNG * K;
const py = (lat) => 16 + (LAT1 - lat) * KM_LAT * K;


const COAST_PATH =
  COAST.map(([la, ln], i) => `${i ? "L" : "M"}${px(ln).toFixed(1)},${py(la).toFixed(1)}`).join(" ") + " Z";

// 지도 기본 뷰포트 · 최대 9배까지 확대
const BASE = { w: 370, h: 660 };
const ASPECT = BASE.h / BASE.w;
const MIN_W = BASE.w / 9;
const FULL_VIEW = { x: 0, y: 0, w: BASE.w, h: BASE.h };

/* ------------------------------------------------------------------- UI */
const Chip = ({ on, onClick, children, dot }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "5px 10px", marginRight: 5, marginBottom: 5,
      border: `1px solid ${on ? C.ink : C.rule}`,
      background: on ? C.ink : "transparent",
      color: on ? "#fff" : C.ink2,
      fontSize: 12, fontFamily: SANS, cursor: "pointer",
      borderRadius: 2, transition: "all .12s",
    }}
  >
    {dot && <span style={{ width: 7, height: 7, borderRadius: 7, background: dot, display: "block" }} />}
    {children}
  </button>
);

const Label = ({ children, right }) => (
  <div style={{
    display: "flex", justifyContent: "space-between", alignItems: "baseline",
    fontFamily: MONO, fontSize: 10, letterSpacing: ".14em", textTransform: "uppercase",
    color: C.ink3, borderBottom: `1px solid ${C.ruleSoft}`, paddingBottom: 5, marginBottom: 10,
  }}>
    <span>{children}</span>{right && <span style={{ letterSpacing: 0 }}>{right}</span>}
  </div>
);

const num = (v) => v.toLocaleString("ko-KR", { maximumFractionDigits: 0 });

/* --------------------------------------------------------------- 집중지수 */
function LQGauge({ lq, w = 96 }) {
  const mid = w / 2;
  const t = Math.min(1, Math.abs(Math.log(Math.max(lq, 0.05)) / Math.log(3)));
  const len = t * mid;
  return (
    <svg width={w} height={12} style={{ display: "block" }}>
      <line x1={0} y1={6} x2={w} y2={6} stroke={C.ruleSoft} strokeWidth="1" />
      <line x1={mid} y1={1} x2={mid} y2={11} stroke={C.rule} strokeWidth="1" />
      <rect
        x={lq >= 1 ? mid : mid - len} y={3}
        width={Math.max(len, 1)} height={6}
        fill={lqColor(lq)}
      />
    </svg>
  );
}

/* ================================================================= APP */
export default function VisitorScanner() {
  const [level, setLevel] = useState("sgg");
  const [mi, setMi] = useState(MONTHS.length - 1);
  const [countries, setCountries] = useState(COUNTRIES.map((c) => c.id));
  const [ages, setAges] = useState([...AGES]);
  const [gender, setGender] = useState("전체");
  const [sortBy, setSortBy] = useState("lq");
  const [sel, setSel] = useState("11680");

  const month = MONTHS[mi];
  const regions = level === "sgg" ? SGG : SIDO;

  const rows = useMemo(
    () => compute(regions, { month, countries, ages, gender }),
    [regions, month, countries, ages, gender]
  );

  const ranked = useMemo(() => {
    const r = [...rows];
    if (sortBy === "lq") r.sort((a, b) => (b.lq - a.lq) || (b.sel - a.sel));
    return r.slice(0, 14);
  }, [rows, sortBy]);

  const maxSel = Math.max(...rows.map((r) => r.sel), 1);
  const total = rows.reduce((a, b) => a + b.sel, 0);
  const totalAll = rows.reduce((a, b) => a + b.all, 0);
  const detail = rows.find((r) => r.id === sel) || rows[0];

  const toggle = (arr, set, v) =>
    set(arr.includes(v) ? (arr.length > 1 ? arr.filter((x) => x !== v) : arr) : [...arr, v]);

  const pyrMax = detail ? Math.max(...detail.pyramid.map((p) => Math.max(p.f, p.m)), 1) : 1;

  /* ------------------------------------------------- 지도 확대 / 이동 */
  const svgRef = useRef(null);
  const ptrs = useRef(new Map());
  const dragging = useRef(null);
  const pinchDist = useRef(0);
  const [view, setView] = useState(FULL_VIEW);
  const zoom = BASE.w / view.w;

  const clampView = useCallback((v) => {
    const w = Math.min(BASE.w, Math.max(MIN_W, v.w));
    const h = w * ASPECT;
    const pad = 40;
    return {
      w, h,
      x: Math.min(Math.max(v.x, -pad), BASE.w - w + pad),
      y: Math.min(Math.max(v.y, -pad), BASE.h - h + pad),
    };
  }, []);

  const zoomAt = useCallback((factor, fx = 0.5, fy = 0.5) => {
    setView((v) => {
      const sx = v.x + fx * v.w, sy = v.y + fy * v.h;
      const w = Math.min(BASE.w, Math.max(MIN_W, v.w / factor));
      const h = w * ASPECT;
      return clampView({ x: sx - fx * w, y: sy - fy * h, w, h });
    });
  }, [clampView]);

  // 휠 확대 — 커서 위치를 고정점으로 유지
  useEffect(() => {
    const el = svgRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(e.deltaY < 0 ? 1.18 : 1 / 1.18,
        (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // 지도 밖에서 손을 떼도 드래그 상태가 남지 않게
  useEffect(() => {
    const end = () => {
      ptrs.current.clear();
      pinchDist.current = 0;
      setTimeout(() => { dragging.current = null; }, 0);
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, []);

  const onPointerDown = (e) => {
    const el = svgRef.current;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size >= 2) {
      const [a, b] = [...ptrs.current.values()];
      pinchDist.current = Math.hypot(a.x - b.x, a.y - b.y);
      dragging.current = null;
    } else {
      // setPointerCapture는 쓰지 않는다 — click 타깃이 svg로 리다이렉트되어
      // 버블(circle) 선택이 먹지 않는다. 대신 window에서 종료를 잡는다.
      dragging.current = { px: e.clientX, py: e.clientY, moved: 0 };
    }
    void el;
  };

  const onPointerMove = (e) => {
    const el = svgRef.current;
    if (!el || !ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = el.getBoundingClientRect();

    if (ptrs.current.size >= 2) {                      // 핀치
      const [a, b] = [...ptrs.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current && Math.abs(d / pinchDist.current - 1) > 0.004) {
        zoomAt(d / pinchDist.current,
          ((a.x + b.x) / 2 - r.left) / r.width, ((a.y + b.y) / 2 - r.top) / r.height);
      }
      pinchDist.current = d;
      return;
    }

    const g = dragging.current;                        // 드래그 이동
    if (!g) return;
    const dx = e.clientX - g.px, dy = e.clientY - g.py;
    g.moved += Math.abs(dx) + Math.abs(dy);
    g.px = e.clientX; g.py = e.clientY;
    setView((v) => clampView({ ...v, x: v.x - (dx / r.width) * v.w, y: v.y - (dy / r.height) * v.h }));
  };

  const onPointerUp = (e) => {
    ptrs.current.delete(e.pointerId);
    if (ptrs.current.size < 2) pinchDist.current = 0;
    if (ptrs.current.size === 0) setTimeout(() => { dragging.current = null; }, 0);
  };

  // 확대 배율은 유지하고 중심만 옮긴다
  const panTo = (r) => setView((v) =>
    clampView({ ...v, x: px(r.lng) - v.w / 2, y: py(r.lat) - v.h / 2 }));

  const focusRegion = (r, div = 4.5) => {
    const w = Math.max(MIN_W, BASE.w / div), h = w * ASPECT;
    setView(clampView({ x: px(r.lng) - w / 2, y: py(r.lat) - h / 2, w, h }));
  };

  // 시도 → 그 시도의 시군구로 내려가면서 해당 권역에 맞춰 확대
  const drillDown = (sidoName) => {
    const list = SGG.filter((x) => x.sido === sidoName);
    if (!list.length) return;
    setLevel("sgg");
    setSel(list.reduce((a, b) => (b.base > a.base ? b : a)).id);
    const xs = list.map((x) => px(x.lng)), ys = list.map((x) => py(x.lat));
    const w = Math.max(Math.max(...xs) - Math.min(...xs) + 60, BASE.w / 6), h = w * ASPECT;
    setView(clampView({
      x: (Math.min(...xs) + Math.max(...xs)) / 2 - w / 2,
      y: (Math.min(...ys) + Math.max(...ys)) / 2 - h / 2, w, h,
    }));
  };

  // 확대할수록 라벨을 더 많이 노출
  const labelN = zoom < 1.4 ? 6 : zoom < 2.5 ? 12 : zoom < 4 ? 26 : rows.length;
  const inView = (r) => {
    const X = px(r.lng), Y = py(r.lat);
    return X > view.x - 12 && X < view.x + view.w + 12 && Y > view.y - 12 && Y < view.y + view.h + 12;
  };
  const hasSgg = level === "sido" && SGG.some((x) => x.sido === detail?.name);

  return (
    <div style={{ background: C.ground, color: C.ink, fontFamily: SANS, minHeight: "100%", padding: 18 }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <header style={{ borderBottom: `2px solid ${C.ink}`, paddingBottom: 12, marginBottom: 16 }}>
        <div className="num" style={{ fontSize: 10, letterSpacing: ".18em", color: C.ink3, marginBottom: 6 }}>
          KTO 이동통신 기반 외국인 방문자 · 추정 모델 · IIPUDA INTERNAL
        </div>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontSize: 27, fontWeight: 800, letterSpacing: "-.02em" }}>
            외국인 밀집 지역 스캐너
          </h1>
          <div style={{ display: "flex", border: `1px solid ${C.ink}` }}>
            {[["sgg", "시군구"], ["sido", "시도"]].map(([v, l]) => (
              <button key={v} onClick={() => { setLevel(v); setSel(v === "sgg" ? "11680" : "11"); setView(FULL_VIEW); }}
                style={{
                  padding: "6px 16px", fontSize: 12, fontFamily: SANS, cursor: "pointer", border: "none",
                  background: level === v ? C.ink : "transparent", color: level === v ? "#fff" : C.ink2,
                }}>{l}</button>
            ))}
          </div>
        </div>
      </header>

      <div className="grid">
        {/* ---------------------------------------------------- 좌: 필터 */}
        <aside style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="card">
            <Label right={month.label}>기간</Label>
            <input type="range" min={0} max={MONTHS.length - 1} value={mi}
              onChange={(e) => setMi(+e.target.value)} />
            <div className="num" style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.ink3 }}>
              <span>{MONTHS[0].label}</span><span>{MONTHS[MONTHS.length - 1].label}</span>
            </div>
          </div>

          <div className="card">
            <Label right={`${countries.length}/${COUNTRIES.length}`}>국적</Label>
            <div>
              {COUNTRIES.map((c) => (
                <Chip key={c.id} on={countries.includes(c.id)} dot={c.color}
                  onClick={() => toggle(countries, setCountries, c.id)}>{c.name}</Chip>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <MiniBtn onClick={() => setCountries(COUNTRIES.map((c) => c.id))}>전체</MiniBtn>
              <MiniBtn onClick={() => setCountries(["CN", "JP", "TW", "HK", "SG"])}>주력 5개국</MiniBtn>
            </div>
          </div>

          <div className="card">
            <Label>연령</Label>
            <div>
              {AGES.map((a) => (
                <Chip key={a} on={ages.includes(a)} onClick={() => toggle(ages, setAges, a)}>{a}</Chip>
              ))}
            </div>
            <Label>{""}</Label>
            <div style={{ marginTop: -4 }}>
              {["전체", "여성", "남성"].map((g) => (
                <Chip key={g} on={gender === g} onClick={() => setGender(g)}>{g}</Chip>
              ))}
            </div>
            <div style={{ marginTop: 8 }}>
              <MiniBtn onClick={() => { setAges(["20대", "30대", "40대"]); setGender("여성"); setCountries(["CN", "JP", "TW", "HK", "SG"]); }}>
                iipuda 코어 세그먼트
              </MiniBtn>
            </div>
          </div>

          <div className="card">
            <Label>선택 세그먼트</Label>
            <Stat label="전국 규모" value={`${num(total)} 만명·일`} />
            <Stat label="전체 대비" value={`${((total / totalAll) * 100).toFixed(1)}%`} />
            <Stat label="상위 5개 지역 점유" value={`${(rows.slice(0, 5).reduce((a, b) => a + b.share, 0) * 100).toFixed(1)}%`} />
          </div>
        </aside>

        {/* ---------------------------------------------------- 중앙: 지도 */}
        <div className="card" style={{ padding: 8, position: "relative", overflow: "hidden" }}>
          <svg
            ref={svgRef}
            className="mapsvg"
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <path d={COAST_PATH} fill={C.land} stroke={C.landEdge}
              strokeWidth={0.8 / zoom} strokeLinejoin="round" />
            <ellipse cx={px(126.55)} cy={py(33.38)} rx={32} ry={14}
              fill={C.land} stroke={C.landEdge} strokeWidth={0.8 / zoom} />

            {rows.slice().reverse().map((r) => {
              const rad = Math.max(3.2, Math.sqrt(r.sel / maxSel) * 30) / zoom;
              const active = r.id === sel;
              return (
                <circle key={r.id}
                  cx={px(r.lng)} cy={py(r.lat)} r={rad}
                  fill={lqColor(r.lq)} fillOpacity={0.78}
                  stroke={active ? C.ink : "#fff"}
                  strokeWidth={(active ? 2 : 0.9) / zoom}
                  style={{ cursor: "pointer" }}
                  onClick={() => {
                    if ((dragging.current?.moved ?? 0) > 6) return;
                    setSel(r.id);
                  }}
                  onDoubleClick={() => focusRegion(r)}
                >
                  <title>{`${r.name} · ${num(r.sel)}만명·일 · 집중지수 ${r.lq.toFixed(2)}x`}</title>
                </circle>
              );
            })}

            {rows.slice(0, labelN).filter(inView).map((r) => (
              <text key={`t${r.id}`}
                x={px(r.lng)}
                y={py(r.lat) - Math.max(3.2, Math.sqrt(r.sel / maxSel) * 30) / zoom - 5 / zoom}
                textAnchor="middle" fontSize={10 / zoom} fontFamily={SANS}
                fontWeight="700" fill={C.ink} pointerEvents="none"
                stroke="#fff" strokeWidth={2.6 / zoom} paintOrder="stroke"
              >
                {r.name.replace("서울 ", "")}
              </text>
            ))}
          </svg>

          {/* 확대 조작 */}
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", flexDirection: "column", gap: 3 }}>
            <MapBtn onClick={() => zoomAt(1.5)} title="확대">＋</MapBtn>
            <MapBtn onClick={() => zoomAt(1 / 1.5)} title="축소">−</MapBtn>
            <MapBtn onClick={() => setView(FULL_VIEW)} title="전국으로 초기화">⤢</MapBtn>
          </div>

          <div className="num" style={{
            position: "absolute", top: 14, left: 14, fontSize: 10, color: C.ink3,
            background: "rgba(247,248,250,.85)", padding: "3px 6px", border: `1px solid ${C.ruleSoft}`,
          }}>
            {zoom.toFixed(1)}x
          </div>

          {/* 범례 */}
          <div style={{
            position: "absolute", left: 14, bottom: 14,
            background: "rgba(247,248,250,.9)", border: `1px solid ${C.ruleSoft}`, padding: "8px 10px",
          }}>
            <div className="num" style={{ fontSize: 9, letterSpacing: ".14em", color: C.ink3, marginBottom: 5 }}>
              집중지수
            </div>
            <div style={{
              width: 108, height: 8,
              background: `linear-gradient(90deg,${[0.4, 0.6, 0.8, 1, 1.3, 1.7, 2.2, 2.6].map(lqColor).join(",")})`,
            }} />
            <div className="num" style={{ display: "flex", justifyContent: "space-between", width: 108, fontSize: 8.5, color: C.ink3, marginTop: 3 }}>
              <span>0.5x</span><span>1.0x</span><span>2.5x+</span>
            </div>
            <div style={{ fontSize: 9.5, color: C.ink3, marginTop: 6 }}>원 크기 = 규모 · 색 = 집중도</div>
            <div style={{ fontSize: 9.5, color: C.ink3, marginTop: 3 }}>휠·핀치 확대 · 드래그 이동 · 더블클릭 초점</div>
          </div>
        </div>

        {/* ---------------------------------------------------- 우: 랭킹 */}
        <div className="card">
          <Label right={
            <span>
              {[["sel", "규모"], ["lq", "집중도"]].map(([v, l]) => (
                <button key={v} onClick={() => setSortBy(v)} style={{
                  border: "none", background: "none", cursor: "pointer", padding: "0 4px",
                  fontFamily: MONO, fontSize: 10, letterSpacing: ".1em",
                  color: sortBy === v ? C.plum : C.ink3,
                  textDecoration: sortBy === v ? "underline" : "none",
                }}>{l}</button>
              ))}
            </span>
          }>순위</Label>

          {ranked.map((r, i) => (
            <div key={r.id} className="row"
              onClick={() => { setSel(r.id); if (zoom > 1.2) panTo(r); }}
              style={{
                display: "grid", gridTemplateColumns: "18px 1fr 60px", gap: 8, alignItems: "center",
                padding: "7px 4px", cursor: "pointer",
                borderLeft: r.id === sel ? `3px solid ${C.plum}` : "3px solid transparent",
                borderBottom: `1px solid ${C.ruleSoft}`,
              }}>
              <span className="num" style={{ fontSize: 10, color: C.ink3 }}>{String(i + 1).padStart(2, "0")}</span>
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 3 }}>{r.name}</div>
                <div style={{ height: 4, background: C.ruleSoft }}>
                  <div style={{ height: 4, width: `${(r.sel / maxSel) * 100}%`, background: C.ink2 }} />
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="num" style={{ fontSize: 12, fontWeight: 700, color: lqColor(r.lq) }}>
                  {r.lq.toFixed(2)}x
                </div>
                <LQGauge lq={r.lq} w={58} />
              </div>
            </div>
          ))}
          <p style={{ fontSize: 10.5, color: C.ink3, lineHeight: 1.6, marginTop: 10, marginBottom: 0 }}>
            집중지수 = 선택 세그먼트의 지역 점유율 ÷ 전체 방문객의 지역 점유율.
            1.0x보다 크면 그 세그먼트가 그 지역에 과대 분포한다는 뜻이다.
          </p>
        </div>
      </div>

      {/* ---------------------------------------------------- 하단: 상세 */}
      {detail && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, letterSpacing: "-.01em" }}>
              {detail.name}
              {detail.sido && <span style={{ fontSize: 12, color: C.ink3, fontWeight: 500, marginLeft: 8 }}>{detail.sido}</span>}
            </h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div className="num" style={{ fontSize: 12, color: C.ink2 }}>
                {num(detail.sel)} 만명·일 · 점유 {(detail.share * 100).toFixed(1)}% ·{" "}
                <span style={{ color: lqColor(detail.lq), fontWeight: 700 }}>집중지수 {detail.lq.toFixed(2)}x</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <MiniBtn onClick={() => focusRegion(detail, level === "sgg" ? 6 : 3)}>지도에서 확대</MiniBtn>
                {hasSgg && <MiniBtn onClick={() => drillDown(detail.name)}>시군구로 내려보기</MiniBtn>}
              </div>
            </div>
          </div>

          {detail.note && (
            <div style={{
              borderLeft: `3px solid ${C.plum}`, background: "#fff", padding: "9px 12px",
              fontSize: 12.5, color: C.ink2, marginBottom: 16, lineHeight: 1.6,
            }}>{detail.note}</div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 24 }}>
            {/* 국적 구성 */}
            <div>
              <Label>국적 구성</Label>
              <div style={{ display: "flex", height: 26, marginBottom: 10 }}>
                {COUNTRIES.filter((c) => detail.byCountry[c.id] > 0).map((c) => {
                  const w = (detail.byCountry[c.id] / detail.sel) * 100;
                  return <div key={c.id} title={`${c.name} ${w.toFixed(1)}%`}
                    style={{ width: `${w}%`, background: c.color }} />;
                })}
              </div>
              {COUNTRIES.filter((c) => detail.byCountry[c.id] > 0)
                .sort((a, b) => detail.byCountry[b.id] - detail.byCountry[a.id])
                .slice(0, 6).map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, padding: "3px 0" }}>
                    <span style={{ width: 9, height: 9, background: c.color, display: "block" }} />
                    <span style={{ flex: 1 }}>{c.name}</span>
                    <span className="num" style={{ color: C.ink2 }}>
                      {((detail.byCountry[c.id] / detail.sel) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
            </div>

            {/* 성·연령 피라미드 */}
            <div>
              <Label right="선택 국적 기준">성 · 연령 분포</Label>
              {detail.pyramid.map((p, i) => (
                <div key={AGES[i]} style={{ display: "grid", gridTemplateColumns: "1fr 44px 1fr", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <div style={{ display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ width: `${(p.m / pyrMax) * 100}%`, height: 14, background: C.ink2 }} />
                  </div>
                  <div className="num" style={{ fontSize: 10.5, textAlign: "center", color: C.ink3 }}>{AGES[i]}</div>
                  <div>
                    <div style={{ width: `${(p.f / pyrMax) * 100}%`, height: 14, background: C.plum }} />
                  </div>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10.5, color: C.ink3, marginTop: 8 }}>
                <span>← 남성</span><span>여성 →</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer style={{ marginTop: 18, paddingTop: 12, borderTop: `1px solid ${C.rule}`, fontSize: 10.5, color: C.ink3, lineHeight: 1.75 }}>
        <strong style={{ color: C.ink2 }}>읽는 법</strong> · 지역 총량은 한국관광공사 이동통신 기반 지역별 방문자수(외국인 = SKT)를 앵커로 쓴다.
        국적·성·연령은 전국 단위 통계뿐이라, 지역별 성향계수로 배분한 <b>추정치</b>다. 절대 인원이 아니라 순위와 집중도 비교용으로만 쓸 것.
        방문자는 일자별 중복 집계이며(2박 3일 = 3명), 시도와 시군구는 집계 기준이 달라 서로 합산할 수 없다.
        현재 값은 실제 API 연동 전 모의 데이터이며, 파일 상단 <span className="num">fetchKtoRegionVisitors</span>에 인증키와 오퍼레이션명을 넣으면 교체된다.
      </footer>
    </div>
  );
}

const MapBtn = ({ onClick, title, children }) => (
  <button onClick={onClick} title={title} aria-label={title} style={{
    width: 26, height: 26, lineHeight: 1, display: "grid", placeItems: "center",
    border: `1px solid ${C.rule}`, background: "rgba(255,255,255,.92)", color: C.ink,
    fontSize: 13, fontFamily: SANS, cursor: "pointer", borderRadius: 2, padding: 0,
  }}>{children}</button>
);

const MiniBtn = ({ onClick, children }) => (
  <button onClick={onClick} style={{
    border: `1px solid ${C.rule}`, background: "#fff", color: C.ink2,
    fontSize: 11, fontFamily: SANS, padding: "4px 9px", cursor: "pointer", borderRadius: 2,
  }}>{children}</button>
);

const Stat = ({ label, value }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "5px 0", borderBottom: `1px solid ${C.ruleSoft}` }}>
    <span style={{ fontSize: 11.5, color: C.ink3 }}>{label}</span>
    <span className="num" style={{ fontSize: 13, fontWeight: 700 }}>{value}</span>
  </div>
);
