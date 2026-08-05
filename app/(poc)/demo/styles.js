/* TargetTour 데모 · 팔레트 / 전역 CSS / 인라인 스타일 시트 */

export const TEAL = "#0E7C6B";
export const INK = "#171A21";
export const WORK = "#FBFBF8";
export const MUTED = "#6B7280";
export const BORDER = "#E7E6E0";
export const CORAL = "#E8846B";

export const mono = "'IBM Plex Mono', ui-monospace, monospace";
export const sans =
  "'IBM Plex Sans KR', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif";

export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+KR:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
button { cursor: pointer; font-family: inherit; }
button:focus-visible { outline: 2px solid ${TEAL}; outline-offset: 2px; }
`;

/* 수요강도 0–100 → 히트맵 색 */
export function heatColor(v) {
  const t = Math.min(1, Math.max(0, v / 100));
  const c1 = [247, 243, 236];
  const c2 = [216, 96, 63];
  const mix = c1.map((a, i) => Math.round(a + (c2[i] - a) * t));
  return `rgb(${mix[0]}, ${mix[1]}, ${mix[2]})`;
}

export const S = {
  root: { fontFamily: sans, color: INK, background: WORK, minHeight: "100%", padding: "0 0 40px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "26px 30px 22px", borderBottom: `1px solid ${BORDER}`, gap: 16, flexWrap: "wrap" },
  brandRow: { display: "flex", alignItems: "center", gap: 9 },
  brandMark: { color: TEAL, fontSize: 15 },
  brandName: { fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em" },
  brandBadge: { fontSize: 10, fontWeight: 600, color: TEAL, border: `1px solid ${TEAL}`, borderRadius: 4, padding: "1px 6px", letterSpacing: "0.08em" },
  brandSub: { margin: "7px 0 0", fontSize: 13, color: MUTED },
  sourceTag: { fontSize: 11, color: MUTED, fontFamily: mono, background: "#F3F2EC", border: `1px solid ${BORDER}`, borderRadius: 6, padding: "6px 10px", maxWidth: 300, lineHeight: 1.5 },
  body: { display: "flex", alignItems: "flex-start" },
  rail: { width: 190, flexShrink: 0, padding: "24px 14px", display: "flex", flexDirection: "column", gap: 4, borderRight: `1px solid ${BORDER}`, position: "sticky", top: 0 },
  railItem: { display: "flex", alignItems: "center", gap: 10, padding: "12px 12px", borderRadius: 9, border: "none", background: "transparent", fontSize: 14, textAlign: "left", width: "100%" },
  railItemActive: { background: "#fff", boxShadow: `inset 0 0 0 1px ${BORDER}` },
  railNum: { fontFamily: mono, fontSize: 12, fontWeight: 600, width: 18 },
  main: { flex: 1, padding: "22px 30px", minWidth: 0, maxWidth: 900 },
  contextBar: { display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 20, flexWrap: "wrap" },
  contextLabel: { fontSize: 12, color: MUTED, fontWeight: 500 },
  regionChips: { display: "flex", gap: 6, flexWrap: "wrap" },
  chip: { fontSize: 12.5, padding: "6px 12px", borderRadius: 20, border: `1px solid ${BORDER}`, background: "#fff", color: MUTED, fontWeight: 500 },
  chipActive: { background: INK, color: "#fff", borderColor: INK },
  kicker: { fontFamily: mono, fontSize: 11, fontWeight: 600, color: TEAL, letterSpacing: "0.1em", marginBottom: 8 },
  h2: { margin: 0, fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" },
  desc: { margin: "7px 0 0", fontSize: 13.5, color: MUTED, lineHeight: 1.6, maxWidth: 660 },
  card: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 },
  matrixWrap: { overflowX: "auto" },
  matrix: { borderCollapse: "separate", borderSpacing: 4, width: "100%" },
  matrixCorner: { width: 90 },
  matrixColHead: { fontSize: 12, fontWeight: 600, color: MUTED, padding: "4px 0", textAlign: "center" },
  matrixRowHead: { fontSize: 12.5, fontWeight: 500, color: INK, paddingRight: 12, whiteSpace: "nowrap", textAlign: "right" },
  rowHeadActive: { color: TEAL, fontWeight: 700 },
  matrixCell: { fontFamily: mono, fontSize: 13, fontWeight: 600, textAlign: "center", padding: "12px 0", borderRadius: 7, minWidth: 52 },
  legend: { display: "flex", alignItems: "center", gap: 8, marginTop: 16 },
  legendLabel: { fontSize: 11, color: MUTED },
  legendBar: { width: 130, height: 8, borderRadius: 4, background: "linear-gradient(90deg, rgb(247,243,236), rgb(216,96,63))" },
  legendNote: { fontSize: 11, color: MUTED, fontFamily: mono, marginLeft: 6 },
  snapTable: { width: "100%", borderCollapse: "collapse", minWidth: 460 },
  snapTh: { fontSize: 11.5, color: MUTED, fontWeight: 600, textAlign: "left", padding: "0 8px 10px", borderBottom: `1px solid ${BORDER}` },
  snapThNum: { fontSize: 11.5, color: MUTED, fontWeight: 600, textAlign: "right", padding: "0 8px 10px", borderBottom: `1px solid ${BORDER}` },
  snapNation: { fontSize: 14, fontWeight: 600, padding: "11px 8px" },
  snapStar: { color: TEAL, marginRight: 6, fontSize: 12 },
  snapNum: { fontFamily: mono, fontSize: 13.5, textAlign: "right", padding: "11px 8px" },
  snapUnit: { fontSize: 10.5, color: MUTED, marginLeft: 2, fontFamily: sans },
  snapRowRec: { background: "#F4F8F6" },
  chartNote: { margin: "6px 0 0", fontSize: 11, color: MUTED, fontFamily: mono, textAlign: "right" },
  stepFoot: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 24 },
  primaryBtn: { display: "inline-flex", alignItems: "center", gap: 7, background: TEAL, color: "#fff", border: "none", borderRadius: 9, padding: "11px 18px", fontSize: 14, fontWeight: 600 },
  ghostBtn: { background: "transparent", color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 9, padding: "11px 16px", fontSize: 14, fontWeight: 500 },
  verdict: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, background: INK, color: "#fff", borderRadius: 14, padding: "26px 28px", flexWrap: "wrap" },
  verdictMain: { minWidth: 240 },
  verdictKicker: { fontFamily: mono, fontSize: 11, color: "#9BE3D5", letterSpacing: "0.1em" },
  verdictTarget: { display: "flex", alignItems: "center", gap: 12, fontSize: 34, fontWeight: 700, letterSpacing: "-0.02em", margin: "8px 0 10px" },
  verdictX: { color: TEAL, fontWeight: 400, fontSize: 26 },
  verdictSeason: { margin: 0, fontSize: 13, color: "#C9CBD2", lineHeight: 1.5 },
  verdictScore: { textAlign: "center", flexShrink: 0 },
  scoreNum: { display: "block", fontFamily: mono, fontSize: 46, fontWeight: 600, color: "#9BE3D5", lineHeight: 1 },
  scoreLabel: { fontSize: 11, color: "#9CA0AB", letterSpacing: "0.08em" },
  metricRow: { display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" },
  metric: { flex: 1, minWidth: 130, background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 11, padding: "16px 18px" },
  metricLabel: { fontSize: 12, color: MUTED, fontWeight: 500 },
  metricValue: { display: "flex", alignItems: "baseline", gap: 4, fontFamily: mono, fontSize: 26, fontWeight: 600, marginTop: 8 },
  metricUnit: { fontSize: 13, color: MUTED, fontWeight: 500 },
  timingGrid: { display: "grid", gridTemplateColumns: "1.15fr 1fr", gap: 14 },
  timingCard: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 },
  timingCol: { display: "flex", flexDirection: "column", gap: 10 },
  timingMini: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" },
  timingHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: INK, marginBottom: 12 },
  kwRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  kwRank: { fontFamily: mono, fontSize: 12, fontWeight: 600, color: TEAL, width: 14 },
  kwName: { fontSize: 13.5, fontWeight: 500, width: 78, flexShrink: 0 },
  kwBarTrack: { flex: 1, height: 7, background: "#F0EFE8", borderRadius: 4, overflow: "hidden" },
  kwBarFill: { height: "100%", background: `linear-gradient(90deg, ${TEAL}, #3FA694)`, borderRadius: 4 },
  kwChg: { fontFamily: mono, fontSize: 12, fontWeight: 600, color: TEAL, width: 40, textAlign: "right" },
  kwHookNote: { margin: "6px 0 0", fontSize: 12.5, color: "#25303B", lineHeight: 1.5 },
  timingMiniText: {},
  miniText: { margin: 0, fontSize: 13, color: INK, lineHeight: 1.55 },
  miniSub: { margin: "5px 0 0", fontSize: 11.5, color: MUTED, fontFamily: mono },
  extBadge: { fontSize: 9.5, color: MUTED, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1px 4px", marginLeft: 4, fontFamily: mono, letterSpacing: "0.05em" },
  rationale: { background: "#F4F8F6", border: `1px solid #D6E7E1`, borderRadius: 12, padding: "18px 20px", marginTop: 16 },
  rationaleKicker: { fontFamily: mono, fontSize: 11, fontWeight: 600, color: TEAL, letterSpacing: "0.06em" },
  rationaleText: { margin: "9px 0 0", fontSize: 14, lineHeight: 1.7, color: "#25303B" },
  channelGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginTop: 8 },
  channelBtn: { position: "relative", textAlign: "left", background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 11, padding: "16px 16px", display: "flex", flexDirection: "column", gap: 4 },
  channelBtnOn: { borderColor: TEAL, boxShadow: `inset 0 0 0 1px ${TEAL}` },
  channelLabel: { fontSize: 15, fontWeight: 600 },
  channelNote: { fontSize: 12, color: MUTED },
  channelCheck: { position: "absolute", top: 12, right: 14, color: TEAL, fontWeight: 700, fontSize: 15, transition: "opacity 0.15s" },
  errorBox: { display: "flex", alignItems: "center", gap: 8, background: "#FBEEED", border: "1px solid #EAC9C5", color: "#B4413A", borderRadius: 9, padding: "12px 14px", fontSize: 13.5, marginTop: 18 },
  resultsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14, marginTop: 24 },
  resultCard: { background: "#fff", border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18 },
  resultHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  resultChannel: { fontSize: 13, fontWeight: 700, color: TEAL },
  resultLangGroup: { display: "flex", alignItems: "center", gap: 6 },
  resultLang: { fontSize: 11, color: MUTED, fontFamily: mono, background: "#F3F2EC", padding: "2px 7px", borderRadius: 5 },
  sampleBadge: { fontSize: 10, fontWeight: 600, color: CORAL, border: `1px solid ${CORAL}`, borderRadius: 4, padding: "1px 5px", letterSpacing: "0.04em" },
  sampleNote: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: 4, background: "#FDF4F1", border: "1px solid #F0D9D1", borderRadius: 9, padding: "12px 14px", fontSize: 12.5, color: "#7A4A3C", lineHeight: 1.6, marginTop: 18 },
  code: { fontFamily: mono, fontSize: 11.5, background: "#F3F2EC", border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1px 5px", color: INK },
  resultHeadline: { margin: "0 0 8px", fontSize: 16, fontWeight: 700, lineHeight: 1.4 },
  resultBody: { margin: 0, fontSize: 13.5, lineHeight: 1.65, color: "#3A424D" },
  tags: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12 },
  tag: { fontSize: 11.5, color: TEAL, background: "#EAF4F1", borderRadius: 5, padding: "3px 8px", fontFamily: mono },
  resultCta: { marginTop: 14, background: INK, color: "#fff", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 600, textAlign: "center" },
  resultGloss: { margin: "12px 0 0", fontSize: 11.5, color: MUTED, fontStyle: "italic" },
  roadmap: { marginTop: 30, borderTop: `1px dashed ${BORDER}`, paddingTop: 18 },
  roadmapTag: { fontFamily: mono, fontSize: 11, color: MUTED, letterSpacing: "0.08em" },
  roadmapText: { margin: "8px 0 0", fontSize: 13, color: MUTED, lineHeight: 1.65, maxWidth: 620 },
};
