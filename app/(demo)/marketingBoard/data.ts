import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";

const DATA_ROOT = path.join(process.cwd(), "data");

// 일본=blue, 중국=orange, 미국=aqua, 대만=yellow, 태국=magenta, 홍콩=green —
// 앱 전체에서 같은 6개국에 같은 색을 쓴다(medicalConsumptionByCountry, countryMonthlySeasonality와 동일).
export const COUNTRIES = [
  { label: "일본", color: "#2a78d6", medical: "4일본월간" },
  { label: "중국", color: "#eb6834", medical: "4중국월간" },
  { label: "미국", color: "#1baf7a", medical: "4미국월간" },
  { label: "대만", color: "#eda100", medical: "4대만월간" },
  { label: "태국", color: "#e87ba4", medical: "4태국월간" },
  { label: "홍콩", color: "#008300", medical: "4홍콩월간" },
] as const;

export type MonthMap<T> = Record<number, T>;

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
  /** 연도 → 월 → 이 국가의 외국인 의료 소비액(원). 전국 합계 — 지역 구분이 없다. */
  medicalByYear: Record<number, MonthMap<number>>;
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

/** 4<국가>월간: 연도별 다운로드 폴더를 전부 합쳐 연도→월 맵으로 만든다(의료 소비액). */
async function loadMedicalMonthly(folder: string, label: string) {
  const root = await findDir(folder);
  const subdirs = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const byYear: Record<number, MonthMap<number>> = {};
  await Promise.all(
    subdirs.map(async (sub) => {
      const rows = await readRows(path.join(root, sub), `${label} 외국인 소비액 추이.csv`);
      for (const c of rows) {
        const year = Number(c[1].slice(0, 4));
        const month = Number(c[1].slice(4, 6));
        (byYear[year] ??= {})[month] = Number(c[2]);
      }
    })
  );
  return byYear;
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
  const grid = await loadTourGrid();
  const boards = await Promise.all(
    COUNTRIES.map(async (c) => ({
      label: c.label,
      color: c.color,
      shareByYear: grid.shares[c.label] ?? {},
      medicalByYear: await loadMedicalMonthly(c.medical, c.label),
    }))
  );
  return { years: grid.years, monthsByYear: grid.monthsByYear, totals: grid.totals, boards };
}

export type MedicalRegionYear = {
  years: number[];
  /** 연도 → 시도별 {건수, 소비액}. 5번 데이터는 국가 구분이 없어 "전체 외국인" 기준이다. */
  byYear: Record<number, { code: string; full: string; short: string; count: number; amount: number }[]>;
};

/** 5_연간2018-2026: 시도 × 연도 의료 소비건수·소비액 (국가 구분 없음). */
export async function loadMedicalRegions(): Promise<MedicalRegionYear> {
  const root = path.join(DATA_ROOT, "5_연간2018-2026");
  const entries = await readdir(root);

  const dirFor = (full: string) => {
    const target = full.normalize("NFC");
    const match = entries.find((e) => e.normalize("NFC").includes(target));
    if (!match) throw new Error(`${root}에서 "${full}" 폴더를 찾지 못했습니다.`);
    return path.join(root, match);
  };

  const loadTrend = async (dir: string, suffix: string) => {
    const rows = await readRows(dir, suffix);
    const out: Record<number, number> = {};
    for (const c of rows) out[Number(c[0])] = Number(c[c.length - 1]);
    return out;
  };

  const perRegion = await Promise.all(
    SIDO_CODES.map(async (r) => {
      const dir = dirFor(r.full);
      const [count, amount] = await Promise.all([
        loadTrend(dir, "외국인 의료 소비건수 추이.csv"),
        loadTrend(dir, "외국인 의료 소비액 추이.csv"),
      ]);
      return { ...r, count, amount };
    })
  );

  const years = [...new Set(perRegion.flatMap((r) => Object.keys(r.count).map(Number)))].sort((a, b) => a - b);
  const byYear: MedicalRegionYear["byYear"] = {};
  for (const y of years) {
    byYear[y] = perRegion.map((r) => ({
      code: r.code,
      full: r.full,
      short: r.short,
      count: r.count[y] ?? 0,
      amount: r.amount[y] ?? 0,
    }));
  }
  return { years, byYear };
}
