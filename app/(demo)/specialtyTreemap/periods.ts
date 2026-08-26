import type { SpecialtyData } from "./categories";

/** 기간 셀렉트 한 항목 — 전국은 스냅샷+연도+월 전부, 시도는 스냅샷 2개만 제공된다. */
export type PeriodOption = { value: string; label: string; group: string };

export function buildPeriodOptions(data: SpecialtyData, region: string): PeriodOption[] {
  if (region !== "전국") {
    return [
      { value: "all", label: "전체기간 누적 (2018–2026)", group: "스냅샷" },
      { value: "y2025", label: "2025년 누적", group: "스냅샷" },
    ];
  }
  return [
    { value: "all", label: "전체기간 누적 (2018–2026)", group: "스냅샷" },
    { value: "y2025", label: "2025년 누적", group: "스냅샷" },
    ...data.nationwide.years.map((y) => ({ value: `year:${y}`, label: `${y}년`, group: "연도별" })),
    ...data.nationwide.months.map((m) => ({
      value: `month:${m}`,
      label: `${m.slice(0, 4)}-${m.slice(4, 6)}`,
      group: "2025년 월별",
    })),
  ];
}

/**
 * 기간 선택을 동네 보드가 쓰는 시간축으로 옮긴다.
 * 동네 자료는 "연간(2018–2026)"과 "월간(2025)" 두 축뿐이라 어느 축에 속하는지만 본다 —
 * 시도를 고르면 기간 옵션이 이 두 스냅샷으로 줄어들어 두 패널이 정확히 같은 축을 본다.
 * (전국의 연도별·월별 세부 시점은 진료과목에만 있고 동네 자료에는 없다.)
 */
export function toNeighborhoodAxis(period: string): "annual" | "monthly" {
  return period === "y2025" || period.startsWith("month:") ? "monthly" : "annual";
}
