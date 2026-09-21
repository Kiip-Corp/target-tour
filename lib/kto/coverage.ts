/* ────────────────────────────────────────────────────────────────
   시군구 집중도 패널의 «서버·클라이언트가 함께 쓰는» 상수.

   lib/kto/concentration.ts는 client.ts(→ process.env)를 거치므로 "use client"
   컴포넌트가 import할 수 없다. 자료 구간과 지표 라벨은 화면에도 필요하니
   서버 의존이 없는 이 파일로 따로 뺀다 — 두 곳에 같은 값을 적어 두면 한쪽만
   고쳤을 때 조용히 어긋난다.
   ──────────────────────────────────────────────────────────────── */

/**
 * API가 자료를 주는 구간. 상한을 넘겨 부르면 오류가 아니라 0건으로 조용히 빈다.
 * 실측으로 확인한 값이라(2026.09는 빈다) 관광공사가 다음 달을 열면 여기만 올리면 된다.
 */
export const FIRST_YM = "202001";
export const LAST_YM = "202608";

/** FIRST_YM~LAST_YM 사이의 YYYYMM을 최신순으로. */
export function availableMonths(): string[] {
  const out: string[] = [];
  const fy = Number(FIRST_YM.slice(0, 4));
  const fm = Number(FIRST_YM.slice(4));
  for (let y = Number(LAST_YM.slice(0, 4)), m = Number(LAST_YM.slice(4)); y > fy || (y === fy && m >= fm); ) {
    out.push(`${y}${String(m).padStart(2, "0")}`);
    if (--m === 0) {
      m = 12;
      y--;
    }
  }
  return out;
}

/** "202608" → "2026.08" */
export function formatYm(ym: string): string {
  return `${ym.slice(0, 4)}.${ym.slice(4)}`;
}

/**
 * 패널이 고를 수 있는 지표. 넷 다 시군구 × 월 단위 지수(기준선 100)다.
 *
 * 연령대 지표(areaTouDivList 3101~3107, areaExpDivList 3201~3207)는 일부러 뺐다 — 실측
 * 결과 외국인 전용이 아니라 내국인을 포함한 전체 방문객이다(외국인 지수가 473으로 튀는
 * 서울 중구의 연령 지수가 79~118로 평평한 것이 근거). 외국인 타깃 보드에 올리면 "이 국적의
 * 20대가 여기 많다"는 틀린 근거가 된다.
 */
export const INDICATOR_META = [
  { key: "3302", label: "외국인 방문자수", hint: "외국인이 얼마나 몰리는가" },
  { key: "3301", label: "외국인 소비액", hint: "몰리는 걸 넘어 실제로 돈을 쓰는가" },
  { key: "3303", label: "국적 다양성", hint: "낮을수록 특정 국적이 쏠린 곳" },
  { key: "2102", label: "숙박 비중", hint: "체류형인가 경유형인가 — 국적 구분 없음" },
] as const;

export type IndicatorKey = (typeof INDICATOR_META)[number]["key"];

export function isIndicatorKey(v: string): v is IndicatorKey {
  return INDICATOR_META.some((i) => i.key === v);
}
