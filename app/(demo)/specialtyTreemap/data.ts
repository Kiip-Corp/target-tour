import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const DATA_ROOT = path.join(process.cwd(), "data");

import type { ShareMap, SpecialtyData } from "./categories";

/** 지역 폴더명 → 짧은 이름. 5_연간/5_월간 모두 같은 18개(전국 포함) 구성이다. */
const REGION_FOLDERS = [
  "전국", "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "울산광역시",
  "대전광역시", "세종특별자치시", "경기도", "충청북도", "충청남도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도", "강원특별자치도", "전북특별자치도",
] as const;
const SHORT: Record<string, string> = {
  전국: "전국", 서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 울산광역시: "울산", 대전광역시: "대전", 세종특별자치시: "세종",
  경기도: "경기", 충청북도: "충북", 충청남도: "충남", 전라남도: "전남", 경상북도: "경북",
  경상남도: "경남", 제주특별자치도: "제주", 강원특별자치도: "강원", 전북특별자치도: "전북",
};

async function readCsv(...segments: string[]) {
  const raw = await readFile(path.join(DATA_ROOT, ...segments), "utf-8");
  return raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
}

/** 3-3/3-6 형태: (진료과목, 비율) 2열 스냅샷 */
async function loadSnapshot(...segments: string[]): Promise<ShareMap> {
  const rows = await readCsv(...segments);
  return Object.fromEntries(rows.map((c) => [c[0].trim(), Number(c[1])]));
}

/** 3-2/3-5 형태: (기준연월, 진료과목, 비율) 3열 추이 → 기간별 맵으로 그룹핑 */
async function loadTrend(...segments: string[]): Promise<Record<string, ShareMap>> {
  const rows = await readCsv(...segments);
  const out: Record<string, ShareMap> = {};
  for (const c of rows) {
    const period = c[0].trim();
    (out[period] ??= {})[c[1].trim()] = Number(c[2]);
  }
  return out;
}

async function findDir(root: string, nameFull: string) {
  // macOS(APFS)는 파일명을 NFD로 저장해 NFC 리터럴과 바이트가 달라진다 — 정규화 후 비교.
  const entries = await readdir(root);
  const target = nameFull.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC").includes(target));
  if (!match) throw new Error(`${root}에서 "${nameFull}" 폴더를 찾지 못했습니다.`);
  return path.join(root, match);
}

async function findCsv(dir: string, suffix: string) {
  const entries = await readdir(dir);
  const target = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(target));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function loadRegionShare(dir: string, suffix: string): Promise<ShareMap> {
  const raw = await readFile(await findCsv(dir, suffix), "utf-8");
  return Object.fromEntries(
    raw
      .replace(/^﻿/, "")
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [category, value] = line.split(",");
        return [category.trim(), Number(value)];
      })
  );
}

async function loadRegions(rootName: string) {
  const root = path.join(DATA_ROOT, rootName);
  return Promise.all(
    REGION_FOLDERS.map(async (full) => {
      const dir = await findDir(root, full);
      const [count, amount] = await Promise.all([
        loadRegionShare(dir, "외국인 의료 소비건수 진료과목별 비율.csv"),
        loadRegionShare(dir, "외국인 의료 소비액 진료과목별 비율.csv"),
      ]);
      return { region: SHORT[full], amount, count };
    })
  );
}

export async function loadSpecialtyData(): Promise<SpecialtyData> {
  const [
    amountAll, countAll, amount2025, count2025,
    amountByYear, countByYear, amountByMonth, countByMonth,
    regionAnnual, regionMonthly,
  ] = await Promise.all([
    loadSnapshot("3_연간2018-2026", "3-3외국인 의료 소비액 진료과목별 비율.csv"),
    loadSnapshot("3_연간2018-2026", "3-6외국인 의료 소비건수 진료과목별 비율.csv"),
    loadSnapshot("3_월간2025", "3-3_외국인 의료 소비액 진료과목별 비율.csv"),
    loadSnapshot("3_월간2025", "3-6_외국인 의료 소비건수 진료과목별 비율.csv"),
    loadTrend("3_연간2018-2026", "3-2외국인 의료 소비액 진료과목별 비율 추이.csv"),
    // 건수 추이(연간)만 파일명이 "진료과목 비율"로, 다른 파일들의 "진료과목별 비율"과 다르다(원본 표기 불일치).
    loadTrend("3_연간2018-2026", "3-5외국인 의료 소비건수 진료과목 비율 추이.csv"),
    loadTrend("3_월간2025", "3-2_외국인 의료 소비액 진료과목별 비율 추이.csv"),
    loadTrend("3_월간2025", "3-5_외국인 의료 소비건수 진료과목 비율 추이.csv"),
    loadRegions("5_연간2018-2026"),
    loadRegions("5_월간2025"),
  ]);

  const years = Object.keys(amountByYear).sort();
  const months = Object.keys(amountByMonth).sort();

  const pairUp = (a: Record<string, ShareMap>, c: Record<string, ShareMap>, keys: string[]) =>
    Object.fromEntries(keys.map((k) => [k, { amount: a[k] ?? {}, count: c[k] ?? {} }]));

  return {
    nationwide: {
      snapshotAll: { amount: amountAll, count: countAll },
      snapshot2025: { amount: amount2025, count: count2025 },
      byYear: pairUp(amountByYear, countByYear, years),
      byMonth: pairUp(amountByMonth, countByMonth, months),
      years,
      months,
    },
    regions: regionAnnual.map((r, i) => ({
      region: r.region,
      annual: { amount: r.amount, count: r.count },
      monthly: { amount: regionMonthly[i].amount, count: regionMonthly[i].count },
    })),
  };
}
