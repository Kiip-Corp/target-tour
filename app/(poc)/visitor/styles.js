/* iipuda 외국인 밀집 지역 스캐너 · 팔레트 / 타이포 / 전역 CSS */

export const C = {
  ground: "#E7EAEE",
  panel: "#F7F8FA",
  ink: "#16202B",
  ink2: "#48586A",
  ink3: "#7C8B9B",
  rule: "#C6CDD5",
  ruleSoft: "#DCE1E7",
  land: "#DDE3E8",
  landEdge: "#AEB9C4",
  jade: "#2E7D74",
  jadeSoft: "#7FA9A4",
  mid: "#CDD4DA",
  plum: "#9E2B56",
  plumSoft: "#C77E9C",
};

export const SANS =
  "'Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',system-ui,sans-serif";
export const MONO =
  "ui-monospace,'SF Mono','JetBrains Mono','Roboto Mono','D2Coding',monospace";

export const CSS = `
  * { box-sizing: border-box; }
  .num { font-family: ${MONO}; font-variant-numeric: tabular-nums; }
  .grid { display: grid; grid-template-columns: 232px minmax(300px,1fr) 320px; gap: 16px; align-items: start; }
  @media (max-width: 1080px) { .grid { grid-template-columns: 1fr; } }
  .card { background: ${C.panel}; border: 1px solid ${C.rule}; padding: 14px; }
  button:focus-visible { outline: 2px solid ${C.plum}; outline-offset: 2px; }
  input[type=range] { width: 100%; accent-color: ${C.plum}; }
  .row:hover { background: #EEF1F4; }
  .mapsvg { cursor: grab; touch-action: none; user-select: none; }
  .mapsvg:active { cursor: grabbing; }
  @media (prefers-reduced-motion: reduce) { * { transition: none !important; } }
`;

/* 집중지수(LQ) → 색 : 1.0x를 중립으로 두고 양쪽으로 발산 */
export function lerpHex(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a), [r2, g2, b2] = p(b);
  const c = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
}
export const lqColor = (lq) =>
  lq <= 1
    ? lerpHex(C.jade, C.mid, Math.min(1, Math.max(0, (lq - 0.4) / 0.6)))
    : lerpHex(C.mid, C.plum, Math.min(1, (lq - 1) / 1.2));
