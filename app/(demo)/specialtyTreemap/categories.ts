/**
 * 진료과목 8개 고정 순서·색 — StackedShareChart(poc2)와 같은 배정을 그대로 쓴다(앱 전체 일관성).
 *
 * data.ts가 아니라 이 파일에 두는 이유: data.ts는 node:fs/promises를 쓰는 서버 전용 모듈이라,
 * 클라이언트 컴포넌트가 거기서 값(상수)을 import하면 fs까지 클라이언트 번들로 끌려가
 * "chunking context does not support external modules" 빌드 에러가 난다.
 * 타입은 erase되지만 값은 남기 때문에, 양쪽이 공유하는 상수는 이렇게 분리해 둔다.
 */
export const CATEGORIES = [
  { key: "피부과", color: "#2a78d6" },
  { key: "성형외과", color: "#eb6834" },
  { key: "약국", color: "#1baf7a" },
  { key: "대학/종합병원", color: "#eda100" },
  { key: "치과", color: "#e87ba4" },
  { key: "안과", color: "#008300" },
  { key: "한의학과", color: "#4a3aa7" },
  { key: "한약방", color: "#e34948" },
] as const;

export type ShareMap = Record<string, number>;
export type MetricPair = { amount: ShareMap; count: ShareMap };

export type SpecialtyData = {
  /** 전국(3번) — 스냅샷 2종 + 연도별/월별 추이. 지역 단위보다 시계열이 촘촘하다. */
  nationwide: {
    snapshotAll: MetricPair;
    snapshot2025: MetricPair;
    byYear: Record<string, MetricPair>;
    byMonth: Record<string, MetricPair>;
    years: string[];
    months: string[];
  };
  /** 지역별(5번) — 시도마다 전체기간 누적/2025년 누적 두 스냅샷만 있다. */
  regions: { region: string; annual: MetricPair; monthly: MetricPair }[];
};
