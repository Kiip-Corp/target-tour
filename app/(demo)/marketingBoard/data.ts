/**
 * 보드가 읽는 원자료 3종. 폴더 이름 앞의 숫자는 data/readme.md의 데이터랩 메뉴 순번이다 —
 * 화면 문구에서는 번호 대신 아래 이름으로 부른다(DataSources.tsx가 그 이름의 출처).
 *
 *   data/7국가지역월간 = 「방문 · 관광소비」    지역별 분석 › 지역별 방문자수/관광소비
 *   data/4국가월간     = 「국가별 의료소비」    고부가 관광 › 의료관광 › 국가별 의료소비 추이
 *   data/5지역월간     = 「지역별 의료소비」    고부가 관광 › 의료관광 › 지역별 의료소비 추이
 *
 * 소비액은 관광·의료 모두 천원 단위다(의료 쪽은 CSV에 표기가 없지만 건당 40만원대라 천원).
 */
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";

const DATA_ROOT = path.join(process.cwd(), "data");

// 일본=blue, 중국=orange, 미국=aqua, 대만=yellow, 태국=magenta, 홍콩=green —
// 앱 전체에서 같은 6개국에 같은 색을 쓴다(medicalConsumptionByCountry, countryMonthlySeasonality와 동일).
export const COUNTRIES = [
  { label: "일본", color: "#2a78d6" },
  { label: "중국", color: "#eb6834" },
  { label: "미국", color: "#1baf7a" },
  { label: "대만", color: "#eda100" },
  { label: "태국", color: "#e87ba4" },
  { label: "홍콩", color: "#008300" },
] as const;

export type MonthMap<T> = Record<number, T>;

export type MedicalCell = {
  /** 이 국가 외국인의 의료 소비액·소비건수(전국). */
  amount: number;
  count: number;
  /** 전체 외국인 의료 소비 중 이 국가가 차지하는 비율(%) — 국적 무관 분모를 역산할 수 있다. */
  amountShare: number;
  countShare: number;
};

/** 국가 구분 없는 "전체 외국인" 분모. 연도 → 시도코드 → 월 → 값. */
export type TourTotals = Record<
  number,
  Record<string, MonthMap<{ visitors: number; spend: number }>>
>;

export type CountryBoard = {
  label: string;
  color: string;
  /**
   * 연도 → 시도코드 → 월 → 해당 시도 방문/관광소비 중 이 국가가 차지하는 비율(%).
   * TourTotals와 곱하면 국가 × 지역 × 월 추정 절대값이 나온다.
   */
  shareByYear: Record<number, Record<string, MonthMap<{ visit?: number; spend?: number }>>>;
  /** 연도 → 월 → 이 국가의 의료 소비. 전국 합계 — 지역 구분이 없다. */
  medicalByYear: Record<number, MonthMap<MedicalCell>>;
};

export type TourData = {
  /** 방문/관광소비 자료가 실제로 있는 연도 — 보드의 "기준연도" 옵션이 된다. */
  years: number[];
  /** 연도 → 자료가 있는 월. 2026처럼 연중 자료는 여기서 잘린다. */
  monthsByYear: Record<number, number[]>;
  totals: TourTotals;
  boards: CountryBoard[];
};

async function findCsv(dir: string, suffix: string) {
  // macOS(APFS)는 파일명을 NFD로 저장해 NFC 리터럴과 바이트가 달라진다 — 정규화 후 비교.
  const entries = await readdir(dir);
  const target = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(target));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function readRows(dir: string, suffix: string) {
  const raw = await readFile(await findCsv(dir, suffix), "utf-8");
  return raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(",").map((c) => c.trim()));
}

async function findDir(name: string) {
  const entries = await readdir(DATA_ROOT);
  const target = name.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC") === target);
  if (!match) throw new Error(`${DATA_ROOT}에서 "${name}" 폴더를 찾지 못했습니다.`);
  return path.join(DATA_ROOT, match);
}

/**
 * 4국가월간: 국가 × 월 의료 소비액·소비건수와 전체 외국인 대비 비율.
 * `playwright/extract-medical.mjs`가 playwright/medical의 zip을 합쳐 만든다.
 *
 * 비율로 역산한 "전체 외국인 의료 소비액"은 6개국이 서로 일치하고, 5번(지역별) 전국 합계와도
 * 맞는다 — 4번과 5번이 같은 지표·같은 단위라는 뜻이라 두 패널을 나란히 읽어도 된다.
 */
export async function loadMedicalByCountry() {
  const dir = await findDir("4국가월간");
  const rows = await readRows(dir, "의료소비_월별.csv");

  const byNation: Record<string, Record<number, MonthMap<MedicalCell>>> = {};
  for (const c of rows) {
    const year = Number(c[1].slice(0, 4));
    const month = Number(c[1].slice(4, 6));
    ((byNation[c[0]] ??= {})[year] ??= {})[month] = {
      amount: Number(c[2]),
      count: Number(c[3]),
      amountShare: Number(c[4]),
      countShare: Number(c[5]),
    };
  }
  return byNation;
}

/**
 * 7국가지역월간: 국가 × 17개 시도 × 월 방문/관광소비.
 *
 * 예전에는 월간 자료의 방문지가 서울특별시 하나뿐이라 "언제"와 "어디에"를 교차할 수 없었다.
 * 지금은 시도 전체를 받아 두 축이 맞물린다 — 두 CSV는 `playwright/extract-datalab.mjs`가
 * playwright/downloads의 zip을 합쳐 만든다.
 *
 * "전체 외국인 방문자 수"·"전체 관광소비액"은 국가와 무관한 분모라 6개국 행에 그대로 반복된다.
 * 그래서 분모는 totals에 한 번만 담고, 국가별로는 비율만 들고 있다가 곱해서 쓴다.
 */
async function loadTourGrid() {
  const dir = await findDir("7국가지역월간");
  const [visitRows, spendRows] = await Promise.all([
    readRows(dir, "방문_월별.csv"),
    readRows(dir, "관광소비_월별.csv"),
  ]);

  const codeOf = new Map(SIDO_CODES.map((r) => [r.full.normalize("NFC"), r.code]));
  const totals: TourTotals = {};
  const shares: Record<string, CountryBoard["shareByYear"]> = {};
  const months: Record<number, Set<number>> = {};

  // 방문자 수 비율(%)이 비어 있는 달이 드물게 있다(세종 2020 등, 표본이 적어 원본에서 마스킹).
  // 0으로 채우면 "그 달엔 아무도 안 왔다"가 되어버리므로 아예 넣지 않고 결측으로 남긴다.
  const put = (
    nation: string,
    code: string,
    year: number,
    month: number,
    key: "visit" | "spend",
    value: number
  ) => {
    const byYear = (shares[nation] ??= {});
    const byCode = (byYear[year] ??= {});
    const byMonth = (byCode[code] ??= {});
    (byMonth[month] ??= {})[key] = value;
  };

  for (const c of visitRows) {
    const code = codeOf.get(c[1].normalize("NFC"));
    if (!code) continue;
    const year = Number(c[2].slice(0, 4));
    const month = Number(c[2].slice(4, 6));
    ((totals[year] ??= {})[code] ??= {})[month] = {
      visitors: Number(c[3]),
      spend: 0,
    };
    (months[year] ??= new Set()).add(month);
    if (c[4] !== "") put(c[0], code, year, month, "visit", Number(c[4]));
  }

  for (const c of spendRows) {
    const code = codeOf.get(c[1].normalize("NFC"));
    if (!code) continue;
    const year = Number(c[2].slice(0, 4));
    const month = Number(c[2].slice(4, 6));
    const cell = totals[year]?.[code]?.[month];
    if (cell) cell.spend = Number(c[4]);
    if (c[3] !== "") put(c[0], code, year, month, "spend", Number(c[3]));
  }

  const years = Object.keys(months).map(Number).sort((a, b) => a - b);
  const monthsByYear: Record<number, number[]> = {};
  for (const y of years) monthsByYear[y] = [...months[y]].sort((a, b) => a - b);

  return { years, monthsByYear, totals, shares };
}

export async function loadTourData(): Promise<TourData> {
  const [grid, medicalByCountry] = await Promise.all([loadTourGrid(), loadMedicalByCountry()]);
  const boards = COUNTRIES.map((c) => ({
    label: c.label,
    color: c.color,
    shareByYear: grid.shares[c.label] ?? {},
    medicalByYear: medicalByCountry[c.label] ?? {},
  }));
  return { years: grid.years, monthsByYear: grid.monthsByYear, totals: grid.totals, boards };
}

/** 진료과목 8종의 소비액·소비건수 비율(%). 값이 0인 과목은 원본에 행이 없어 키도 없다. */
export type SpecialtyShares = Record<string, { amount: number; count: number }>;

/** 4국가월간/진료과목_월별: 국가 → 연도 → 월 → 진료과목 구성. */
export async function loadCountrySpecialty() {
  const dir = await findDir("4국가월간");
  const rows = await readRows(dir, "진료과목_월별.csv");

  const byNation: Record<string, Record<number, MonthMap<SpecialtyShares>>> = {};
  for (const c of rows) {
    const year = Number(c[1].slice(0, 4));
    const month = Number(c[1].slice(4, 6));
    const shares = (((byNation[c[0]] ??= {})[year] ??= {})[month] ??= {});
    shares[c[2]] = { amount: Number(c[3]), count: Number(c[4]) };
  }
  return byNation;
}

/**
 * 5지역월간/진료과목_연간: 시도코드(또는 "전국") → 연도 → 진료과목 구성.
 * 지역 자료는 국가 자료와 달리 조회 기간 전체를 뭉갠 스냅샷뿐이라 월 단위가 없다.
 */
export async function loadRegionSpecialty() {
  const dir = await findDir("5지역월간");
  const rows = await readRows(dir, "진료과목_연간.csv");

  const codeOf = new Map(SIDO_CODES.map((r) => [r.full.normalize("NFC"), r.code]));
  const byRegion: Record<string, Record<number, SpecialtyShares>> = {};
  for (const c of rows) {
    const region = c[0].normalize("NFC");
    // 전남광주통합특별시는 광주 + 전라남도와 같은 중복 행이라 지도 코드가 없다 — 건너뛴다.
    const key = region === "전국" ? "전국" : codeOf.get(region);
    if (!key) continue;
    const shares = ((byRegion[key] ??= {})[Number(c[1])] ??= {});
    shares[c[2]] = { amount: Number(c[3]), count: Number(c[4]) };
  }
  return byRegion;
}

export type MedicalBoardData = {
  years: number[];
  monthsByYear: Record<number, number[]>;
  countries: {
    label: string;
    color: string;
    byYear: Record<number, MonthMap<MedicalCell>>;
    specialtyByYear: Record<number, MonthMap<SpecialtyShares>>;
  }[];
  regions: MedicalRegionData;
  regionSpecialty: Record<string, Record<number, SpecialtyShares>>;
};

/** 의료관광 전용 페이지(2번째 보드)가 쓰는 4·5번 묶음. 관광(7번) 자료는 싣지 않는다. */
export async function loadMedicalBoardData(): Promise<MedicalBoardData> {
  const [byCountry, countrySpecialty, regions, regionSpecialty] = await Promise.all([
    loadMedicalByCountry(),
    loadCountrySpecialty(),
    loadMedicalRegions(),
    loadRegionSpecialty(),
  ]);

  const countries = COUNTRIES.map((c) => ({
    label: c.label,
    color: c.color,
    byYear: byCountry[c.label] ?? {},
    specialtyByYear: countrySpecialty[c.label] ?? {},
  }));

  const years = Object.keys(regions.monthsByYear).map(Number).sort((a, b) => a - b);
  return { years, monthsByYear: regions.monthsByYear, countries, regions, regionSpecialty };
}

export type MedicalRegionData = {
  /** 연도 → 그 해에 자료가 있는 월. */
  monthsByYear: Record<number, number[]>;
  /**
   * 연도 → 월 → 시도코드 → 의료 소비. 5번 자료는 국가 구분이 없어 "전체 외국인" 기준이다.
   * 자료가 없는 지역·월은 키 자체가 없다(2026.07 광주·전남 등).
   */
  byYearMonth: Record<number, MonthMap<Record<string, { count: number; amount: number }>>>;
  /** 연도 → 월 → 데이터랩 "전국" 값. 시도가 특정되지 않은 소비가 있어 17개 시도 합계보다 크다. */
  nationwide: Record<number, MonthMap<{ count: number; amount: number }>>;
};

/**
 * 5지역월간: 시도 × 월 의료 소비액·소비건수 (국가 구분 없음).
 * `playwright/extract-medical-region.mjs`가 playwright/getMedicalTourSearch의 zip을 합쳐 만든다.
 *
 * 예전에는 연간 스냅샷뿐이라 "언제"와 교차할 수 없었고, 최신 연도가 몇 월까지 누적된 값인지도
 * 파일만 봐서는 알 수 없어 4번에서 역산해야 했다. 지금은 월이 그대로 들어 있다.
 */
export async function loadMedicalRegions(): Promise<MedicalRegionData> {
  const dir = await findDir("5지역월간");
  const rows = await readRows(dir, "의료소비_월별.csv");

  const codeOf = new Map(SIDO_CODES.map((r) => [r.full.normalize("NFC"), r.code]));
  const byYearMonth: MedicalRegionData["byYearMonth"] = {};
  const nationwide: MedicalRegionData["nationwide"] = {};
  const months: Record<number, Set<number>> = {};

  for (const c of rows) {
    const region = c[0].normalize("NFC");
    const year = Number(c[1].slice(0, 4));
    const month = Number(c[1].slice(4, 6));
    const cell = { amount: Number(c[2]), count: Number(c[3]) };

    if (region === "전국") {
      (nationwide[year] ??= {})[month] = cell;
      (months[year] ??= new Set()).add(month);
      continue;
    }
    // 전남광주통합특별시는 광주광역시 + 전라남도와 원 단위까지 같은 중복 행이라 더하면 이중계상이 된다.
    // 지도에 코드도 없어 통째로 건너뛴다 — 대신 두 구 시도가 2026.07부터 결측이 된다.
    const code = codeOf.get(region);
    if (!code) continue;
    ((byYearMonth[year] ??= {})[month] ??= {})[code] = cell;
  }

  const monthsByYear: Record<number, number[]> = {};
  for (const y of Object.keys(months).map(Number)) monthsByYear[y] = [...months[y]].sort((a, b) => a - b);

  return { monthsByYear, byYearMonth, nationwide };
}
