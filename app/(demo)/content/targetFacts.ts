/**
 * ④ 콘텐츠 탭이 카피 생성의 근거로 쓰는 실측 지표.
 *
 * ①②③ 탭과 같은 데이터랩 원자료를 읽되, 차트가 아니라 "이 타깃이 왜 값진가"를 한 줄씩
 * 문장으로 만들 수 있을 만큼만 접어서 내보낸다. 계산은 전부 서버에서 끝내고 클라이언트에는
 * 접힌 값만 넘긴다 — 17개 시도 × 6개국 × 7개 연도라 원자료보다 오히려 작다.
 *
 * ⚠ 방문·관광소비의 국가별 값은 원자료가 아니라 추정치다. 데이터랩은 시도 × 월로 "전체 외국인"
 *    절대값과 그중 해당 국가 비율(%)을 따로 주기 때문에 둘을 곱해 만든다(① 탭과 같은 방식).
 *    반면 의료소비는 국가별 값이 원자료 그대로이고, 지역별 값은 국가 구분이 없는 전체 외국인
 *    합계다 — 그래서 아래 타입도 국가 축과 지역 축을 섞지 않고 따로 둔다.
 */
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";
import {
  loadCountrySpecialty,
  loadMedicalRegions,
  loadRegionSpecialty,
  loadTourData,
  type SpecialtyShares,
} from "../_marketingBoard/data";

export type Specialty = { name: string; share: number };

/** 전년 대비 구성비가 움직인 폭(%p)까지 붙은 진료과목. 카피의 후크가 여기서 나온다. */
export type SpecialtyTrend = Specialty & { delta: number };

/** 국가 × 지역 × 연도 — 방문·관광소비 추정. */
export type TourFacts = {
  /** 추정 방문자 수(명). 전체 외국인 × 국가 비율. */
  visitors: number;
  /**
   * 같은 달 구간의 그 시도 전체 외국인 방문자 수(명) — 국가 구분 없는 원자료.
   * visitShare의 분모라, 국가 비율이 결측인 달은 분자와 함께 빠진다.
   */
  totalVisitors: number;
  /** 그 시도 외국인 방문자 중 이 국가가 차지하는 비율(%). */
  visitShare: number;
  /** 추정 관광소비액(천원). */
  tourSpend: number;
  /** 방문 1회당 관광소비액(만원). */
  spendPerVisit: number;
  /** 추정 방문자가 가장 많은 달. */
  peakMonth: number | null;
  /** 전년 같은 달 구간 대비 추정 방문자 증감(%). 비교할 달이 없으면 null. */
  yoy: number | null;
  /** 이 국가 추정 방문자 기준 17개 시도 중 순위. */
  regionRank: number;
};

/** 국가 × 연도 — 의료소비(전국 합계, 지역 구분 없음). */
export type CountryMedicalFacts = {
  /** 이 국가의 전국 의료 소비액(천원)·소비건수 — 원자료 그대로. */
  amount: number;
  count: number;
  /** 전체 외국인 의료 소비액 중 이 국가가 차지하는 비율(%). */
  amountShare: number;
  peakMonth: number | null;
  /** 소비액 구성비 상위 진료과목(월별 구성비의 평균). */
  topSpecialties: Specialty[];
  /** 전년 대비 구성비가 가장 많이 오른 진료과목. 전년 자료가 없으면 빈 배열. */
  risingSpecialties: SpecialtyTrend[];
};

/** 지역 × 연도 — 의료소비(전체 외국인 합계, 국가 구분 없음). */
export type RegionMedicalFacts = {
  amount: number;
  count: number;
  peakMonth: number | null;
  /** 그 시도의 소비액 구성비 상위 진료과목(연간 스냅샷). */
  topSpecialties: Specialty[];
  /** 전년 대비 구성비가 가장 많이 오른 진료과목. */
  risingSpecialties: SpecialtyTrend[];
};

export type ContentFacts = {
  years: number[];
  defaultYear: number;
  /** 연도 → 방문·관광소비 자료가 있는 월. 2026처럼 연중 자료는 여기서 잘린다. */
  monthsByYear: Record<number, number[]>;
  regions: { code: string; full: string; short: string }[];
  countries: { label: string; color: string }[];
  /** 연도 → 시도코드 → 국가 → 추정. 자료가 없는 칸은 null(합계 0과 구분). */
  tour: Record<number, Record<string, Record<string, TourFacts | null>>>;
  countryMedical: Record<number, Record<string, CountryMedicalFacts | null>>;
  regionMedical: Record<number, Record<string, RegionMedicalFacts | null>>;
};

/** 진료과목 → 소비액 구성비(%). 원자료가 절대액이 아니라 비율뿐이라 합이 100이다. */
type ShareMap = Record<string, number>;

const shareMapOf = (shares: SpecialtyShares | undefined): ShareMap =>
  Object.fromEntries(Object.entries(shares ?? {}).map(([name, v]) => [name, v.amount]));

/** 월별 구성비를 단순평균한다. 원자료가 월 단위 비율(%)뿐이라 가중치로 쓸 절대액이 없다. */
function averageShares(byMonth: Record<number, SpecialtyShares> | undefined): ShareMap {
  const months = Object.values(byMonth ?? {});
  if (months.length === 0) return {};
  const sum: ShareMap = {};
  for (const shares of months) {
    for (const [name, v] of Object.entries(shares)) sum[name] = (sum[name] ?? 0) + v.amount;
  }
  return Object.fromEntries(Object.entries(sum).map(([name, t]) => [name, t / months.length]));
}

const topOf = (cur: ShareMap, n: number): Specialty[] =>
  Object.entries(cur)
    .map(([name, share]) => ({ name, share }))
    .filter((s) => s.share > 0)
    .sort((a, b) => b.share - a.share)
    .slice(0, n);

/**
 * 전년 대비 구성비가 오른 과목. 구성비는 합이 100%라 "올랐다"는 곧 그 해에 돈이 그쪽으로
 * 옮겨갔다는 뜻이다 — 절대액이 원자료에 없으므로 이게 이 자료로 잡을 수 있는 유일한 모멘텀이다.
 * 전년 자료가 통째로 없으면(시계열 첫 해) 빈 배열이라, 그때는 1위 과목이 후크가 된다.
 */
function risingOf(cur: ShareMap, prev: ShareMap, n: number): SpecialtyTrend[] {
  if (Object.keys(prev).length === 0) return [];
  return Object.entries(cur)
    .map(([name, share]) => ({ name, share, delta: share - (prev[name] ?? 0) }))
    .filter((s) => s.delta > 0.1)
    .sort((a, b) => b.delta - a.delta)
    .slice(0, n);
}

function peakOf(byMonth: Record<number, number>) {
  const entries = Object.entries(byMonth).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  return Number(entries.reduce((a, b) => (b[1] > a[1] ? b : a))[0]);
}

export async function loadContentFacts(): Promise<ContentFacts> {
  const [tour, countrySpecialty, regions, regionSpecialty] = await Promise.all([
    loadTourData(),
    loadCountrySpecialty(),
    loadMedicalRegions(),
    loadRegionSpecialty(),
  ]);

  const years = tour.years;
  // ①②③ 탭과 같은 기본 연도 — 12개월이 다 찬 마지막 해. 반년치 2026이 기본이 되면
  // 연간 합계가 앞 해의 절반으로 보여 "전년 대비 −50%"처럼 읽힌다.
  const fullYears = years.filter((y) => (tour.monthsByYear[y]?.length ?? 0) === 12);
  const defaultYear = fullYears[fullYears.length - 1] ?? years[years.length - 1];

  /** 국가 × 시도 × 연도의 월별 추정 방문자·관광소비. 결측 월은 키 자체를 넣지 않는다. */
  const estimate = (country: string, code: string, year: number) => {
    const board = tour.boards.find((b) => b.label === country);
    const visitors: Record<number, number> = {};
    const spend: Record<number, number> = {};
    let totalVisitors = 0;
    for (const m of tour.monthsByYear[year] ?? []) {
      const t = tour.totals[year]?.[code]?.[m];
      if (!t) continue;
      const s = board?.shareByYear[year]?.[code]?.[m];
      // 분모는 분자와 같은 달만 더한다. 비율이 마스킹된 달(세종 2020 등)의 전체 외국인까지
      // 분모에 넣으면 "그 시도 외국인 중 몇 %"가 실제보다 작게 나온다.
      if (s?.visit !== undefined) {
        visitors[m] = (t.visitors * s.visit) / 100;
        totalVisitors += t.visitors;
      }
      if (s?.spend !== undefined) spend[m] = (t.spend * s.spend) / 100;
    }
    const has = Object.keys(visitors).length > 0;
    return has ? { visitors, spend, totalVisitors, months: Object.keys(visitors).map(Number) } : null;
  };

  const sumOf = (byMonth: Record<number, number>, months?: number[]) =>
    (months ?? Object.keys(byMonth).map(Number)).reduce((a, m) => a + (byMonth[m] ?? 0), 0);

  const tourGrid: ContentFacts["tour"] = {};
  for (const year of years) {
    tourGrid[year] = {};
    // 순위는 국가별로 17개 시도를 줄 세워야 나오므로 먼저 전 시도를 계산해 둔다.
    const perCountry: Record<string, { code: string; visitors: number }[]> = {};

    for (const r of SIDO_CODES) {
      tourGrid[year][r.code] = {};
      for (const c of tour.boards) {
        const est = estimate(c.label, r.code, year);
        if (!est) {
          tourGrid[year][r.code][c.label] = null;
          continue;
        }
        const visitors = sumOf(est.visitors);
        const tourSpend = sumOf(est.spend);
        (perCountry[c.label] ??= []).push({ code: r.code, visitors });

        // 전년비는 두 해에 다 있는 달만 견준다 — 2026(7월까지)을 2025(12개월)와 통째로
        // 비교하면 자료가 없는 달이 감소로 둔갑한다.
        const prev = estimate(c.label, r.code, year - 1);
        const shared = prev ? est.months.filter((m) => prev.visitors[m] !== undefined) : [];
        const prevSum = prev ? sumOf(prev.visitors, shared) : 0;
        const yoy =
          prev && shared.length > 0 && prevSum > 0
            ? ((sumOf(est.visitors, shared) - prevSum) / prevSum) * 100
            : null;

        tourGrid[year][r.code][c.label] = {
          visitors,
          totalVisitors: est.totalVisitors,
          visitShare: est.totalVisitors > 0 ? (visitors / est.totalVisitors) * 100 : 0,
          tourSpend,
          spendPerVisit: visitors > 0 ? tourSpend / visitors / 10 : 0,
          peakMonth: peakOf(est.visitors),
          yoy,
          regionRank: 0,
        };
      }
    }

    for (const [label, rows] of Object.entries(perCountry)) {
      rows.sort((a, b) => b.visitors - a.visitors);
      rows.forEach((row, i) => {
        const cell = tourGrid[year][row.code][label];
        if (cell) cell.regionRank = i + 1;
      });
    }
  }

  const countryMedical: ContentFacts["countryMedical"] = {};
  for (const year of years) {
    countryMedical[year] = {};
    for (const c of tour.boards) {
      const byMonth = c.medicalByYear[year];
      if (!byMonth || Object.keys(byMonth).length === 0) {
        countryMedical[year][c.label] = null;
        continue;
      }
      const cells = Object.values(byMonth);
      const cur = averageShares(countrySpecialty[c.label]?.[year]);
      countryMedical[year][c.label] = {
        amount: cells.reduce((a, v) => a + v.amount, 0),
        count: cells.reduce((a, v) => a + v.count, 0),
        // 비율은 달마다 분모가 달라 단순평균한다 — 소구 방향을 잡는 용도라 이 정도면 된다.
        amountShare: cells.reduce((a, v) => a + v.amountShare, 0) / cells.length,
        peakMonth: peakOf(
          Object.fromEntries(Object.entries(byMonth).map(([m, v]) => [Number(m), v.amount]))
        ),
        topSpecialties: topOf(cur, 3),
        risingSpecialties: risingOf(cur, averageShares(countrySpecialty[c.label]?.[year - 1]), 2),
      };
    }
  }

  const regionMedical: ContentFacts["regionMedical"] = {};
  for (const year of years) {
    regionMedical[year] = {};
    for (const r of SIDO_CODES) {
      const months = regions.byYearMonth[year] ?? {};
      const cells = Object.entries(months)
        .map(([m, byCode]) => [Number(m), byCode[r.code]] as const)
        .filter((e): e is [number, { count: number; amount: number }] => Boolean(e[1]));
      if (cells.length === 0) {
        regionMedical[year][r.code] = null;
        continue;
      }
      regionMedical[year][r.code] = {
        amount: cells.reduce((a, [, v]) => a + v.amount, 0),
        count: cells.reduce((a, [, v]) => a + v.count, 0),
        peakMonth: peakOf(Object.fromEntries(cells.map(([m, v]) => [m, v.amount]))),
        topSpecialties: topOf(shareMapOf(regionSpecialty[r.code]?.[year]), 3),
        risingSpecialties: risingOf(
          shareMapOf(regionSpecialty[r.code]?.[year]),
          shareMapOf(regionSpecialty[r.code]?.[year - 1]),
          2
        ),
      };
    }
  }

  return {
    years,
    defaultYear,
    monthsByYear: tour.monthsByYear,
    regions: SIDO_CODES.map((r) => ({ code: r.code, full: r.full, short: r.short })),
    countries: tour.boards.map((b) => ({ label: b.label, color: b.color })),
    tour: tourGrid,
    countryMedical,
    regionMedical,
  };
}
