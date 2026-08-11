import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";

const DATA_ROOT = path.join(process.cwd(), "data");

// 일본=blue, 중국=orange, 미국=aqua, 대만=yellow, 태국=magenta, 홍콩=green —
// 앱 전체에서 같은 6개국에 같은 색을 쓴다(medicalConsumptionByCountry, countryMonthlySeasonality와 동일).
export const COUNTRIES = [
  { label: "일본", color: "#2a78d6", monthly: "7일본월간2020", annual: "7일본연간", medical: "4일본월간", visitKey: "일본인", heatKey: "일본" },
  { label: "중국", color: "#eb6834", monthly: "7중국월간2020", annual: "7중국연간", medical: "4중국월간", visitKey: "중국인", heatKey: "중국" },
  { label: "미국", color: "#1baf7a", monthly: "7미국월간2020", annual: "7미국연간", medical: "4미국월간", visitKey: "미국인", heatKey: "미국" },
  // 대만만 "방문현황 히트맵.csv"에서 거주지가 "타이완"으로 표기돼 있다(원본 데이터 표기 불일치).
  { label: "대만", color: "#eda100", monthly: "7대만월간2020", annual: "7대만연간", medical: "4대만월간", visitKey: "대만인", heatKey: "대만", heatmapKey: "타이완" },
  { label: "태국", color: "#e87ba4", monthly: "7태국월간", annual: "7태국연간", medical: "4태국월간", visitKey: "태국인", heatKey: "태국" },
  { label: "홍콩", color: "#008300", monthly: "7홍콩월간", annual: "7홍콩연간", medical: "4홍콩월간", visitKey: "홍콩인", heatKey: "홍콩" },
] as const;

/** 7번 월간(방문/관광소비)이 실제로 커버하는 연도 — 이 범위가 보드의 "기준연도" 옵션이 된다. */
export const TOUR_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export type RegionValue = { code: string; full: string; short: string; value: number };

export type CountryBoard = {
  label: string;
  color: string;
  /** 연도 → 월(1~12) → 값. 서울 방문 외국인 중 해당 국가 비율(%) */
  visitByYear: Record<number, Record<number, number>>;
  /** 연도 → 월(1~12) → 값. 서울 관광소비 중 해당 국가 비율(%) */
  spendByYear: Record<number, Record<number, number>>;
  /** 연도 → 월(1~12) → 값. 해당 국가 외국인 의료 소비액(원, 전국 기준) */
  medicalByYear: Record<number, Record<number, number>>;
  /** 17개 시도별 방문자 비율(%) — 연간 스냅샷(월 구분 없음) */
  regionVisit: RegionValue[];
  /** 17개 시도별 관광소비 비율(%) — 연간 스냅샷(월 구분 없음) */
  regionSpend: RegionValue[];
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
    .map((line) => line.split(","));
}

async function findDir(name: string) {
  const entries = await readdir(DATA_ROOT);
  const target = name.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC") === target);
  if (!match) throw new Error(`${DATA_ROOT}에서 "${name}" 폴더를 찾지 못했습니다.`);
  return path.join(DATA_ROOT, match);
}

/** 7<국가>월간: 연도별 하위 폴더에 12개월씩 나뉘어 있어 연도→월 2단 맵으로 모은다. */
async function loadTourMonthly(folder: string, visitKey: string, spendKey: string) {
  const root = await findDir(folder);
  const visitByYear: Record<number, Record<number, number>> = {};
  const spendByYear: Record<number, Record<number, number>> = {};

  await Promise.all(
    TOUR_YEARS.map(async (year) => {
      const dir = path.join(root, String(year));
      // 원본 수집이 누락돼 폴더만 있고 비어 있는 연도가 있을 수 있어 방어한다.
      const files = await readdir(dir).catch(() => []);
      if (files.filter((f) => !f.startsWith(".")).length === 0) return;

      const [visitRows, spendRows] = await Promise.all([
        readRows(dir, "방문 추이.csv"),
        readRows(dir, "관광소비 추이.csv"),
      ]);
      visitByYear[year] = {};
      spendByYear[year] = {};
      for (const c of visitRows) {
        if (c[1] !== visitKey) continue;
        visitByYear[year][Number(c[0].slice(4, 6))] = Number(c[4]);
      }
      for (const c of spendRows) {
        if (c[1] !== spendKey) continue;
        spendByYear[year][Number(c[0].slice(4, 6))] = Number(c[3]);
      }
    })
  );
  return { visitByYear, spendByYear };
}

/** 4<국가>월간: 연도별 다운로드 폴더를 전부 합쳐 연도→월 맵으로 만든다(의료 소비액). */
async function loadMedicalMonthly(folder: string, label: string) {
  const root = await findDir(folder);
  const subdirs = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const byYear: Record<number, Record<number, number>> = {};
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

/** 7<국가>연간: 국가 × 17개 시도 분포(연간 스냅샷). */
async function loadRegionDistribution(folder: string, heatmapKey: string, spendKey: string) {
  const dir = await findDir(folder);
  const [visitRows, spendRows] = await Promise.all([
    readRows(dir, "방문현황 히트맵.csv"),
    readRows(dir, "관광소비 현황.csv"),
  ]);

  const pick = (rows: string[][], key: string) => {
    const map = new Map<string, number>();
    for (const c of rows) {
      if (c[0].trim() !== key) continue;
      map.set(c[1].trim(), Number(c[2]));
    }
    return SIDO_CODES.map((r) => ({
      code: r.code,
      full: r.full,
      short: r.short,
      value: map.get(r.full) ?? 0,
    }));
  };
  return { regionVisit: pick(visitRows, heatmapKey), regionSpend: pick(spendRows, spendKey) };
}

export async function loadCountryBoards(): Promise<CountryBoard[]> {
  return Promise.all(
    COUNTRIES.map(async (c) => {
      const heatmapKey = "heatmapKey" in c ? c.heatmapKey : c.heatKey;
      const [tour, medicalByYear, region] = await Promise.all([
        loadTourMonthly(c.monthly, c.visitKey, c.heatKey),
        loadMedicalMonthly(c.medical, c.label),
        loadRegionDistribution(c.annual, heatmapKey, c.heatKey),
      ]);
      return {
        label: c.label,
        color: c.color,
        visitByYear: tour.visitByYear,
        spendByYear: tour.spendByYear,
        medicalByYear,
        regionVisit: region.regionVisit,
        regionSpend: region.regionSpend,
      };
    })
  );
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
