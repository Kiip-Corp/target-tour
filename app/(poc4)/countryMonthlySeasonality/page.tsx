import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import SeasonalityChart from "./SeasonalityChart";
import InsightBox from "../InsightBox";
import type { NamedSeries } from "../MultiLineChart";

const DATA_ROOT = path.join(process.cwd(), "data");

// 일본=blue, 중국=orange, 미국=aqua, 대만=yellow, 태국=magenta, 홍콩=green —
// app/(poc2)/medicalConsumptionByCountry/page.tsx와 같은 색 배정(같은 6개국, 앱 전체 일관성).
const COUNTRIES = [
  { folder: "일본월간2020", label: "일본", visitKey: "일본인", spendKey: "일본", color: "#2a78d6" },
  { folder: "중국월간2020", label: "중국", visitKey: "중국인", spendKey: "중국", color: "#eb6834" },
  { folder: "미국월간2020", label: "미국", visitKey: "미국인", spendKey: "미국", color: "#1baf7a" },
  { folder: "대만월간2020", label: "대만", visitKey: "대만인", spendKey: "대만", color: "#eda100" },
  { folder: "태국월간", label: "태국", visitKey: "태국인", spendKey: "태국", color: "#e87ba4" },
  { folder: "홍콩월간", label: "홍콩", visitKey: "홍콩인", spendKey: "홍콩", color: "#008300" },
];

const YEAR = "2025";

async function findCsv(dir: string, suffix: string) {
  const entries = await readdir(dir);
  const target = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(target));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function readRows(dir: string, suffix: string) {
  const file = await findCsv(dir, suffix);
  const raw = await readFile(file, "utf-8");
  return raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
}

async function findDataDir(folderSuffix: string) {
  const entries = await readdir(DATA_ROOT);
  const target = `7${folderSuffix}`.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC") === target);
  if (!match) throw new Error(`${DATA_ROOT}에서 "${target}" 폴더를 찾지 못했습니다.`);
  return path.join(DATA_ROOT, match);
}

async function loadMonthlySeries(
  folderSuffix: string,
  visitKey: string,
  spendKey: string
): Promise<{ visit: Map<number, number>; spend: Map<number, number> }> {
  const yearDir = path.join(await findDataDir(`${folderSuffix}월간2020`.replace("월간2020", "월간") + ""), "");
  // 태국/홍콩은 폴더명이 "7태국월간"/"7홍콩월간"(연도 접미사 없음)이라 위 replace로는 못 맞추므로
  // 실제로는 아래에서 폴더 접미사를 그대로 넘겨받아 처리한다(이 함수는 사용하지 않음 — 정리용 no-op).
  void yearDir;
  throw new Error("unused");
}

async function loadMonthly2025(
  monthlyFolderSuffix: string,
  visitKey: string,
  spendKey: string
): Promise<{ visit: Map<number, number>; spend: Map<number, number> }> {
  const dir = await findDataDir(monthlyFolderSuffix);
  const yearDir = path.join(dir, YEAR);

  const [visitRows, spendRows] = await Promise.all([
    readRows(yearDir, "방문 추이.csv"),
    readRows(yearDir, "관광소비 추이.csv"),
  ]);

  const visit = new Map<number, number>();
  for (const cols of visitRows) {
    if (cols[1] !== visitKey) continue;
    visit.set(Number(cols[0].slice(4, 6)), Number(cols[4]));
  }
  const spend = new Map<number, number>();
  for (const cols of spendRows) {
    if (cols[1] !== spendKey) continue;
    spend.set(Number(cols[0].slice(4, 6)), Number(cols[3]));
  }
  return { visit, spend };
}

async function loadAnnual(
  annualFolderSuffix: string,
  visitKey: string,
  spendKey: string
): Promise<{ visit: Map<number, number>; spend: Map<number, number> }> {
  const dir = await findDataDir(annualFolderSuffix);
  const [visitRows, spendRows] = await Promise.all([
    readRows(dir, "방문 추이.csv"),
    readRows(dir, "관광소비 추이.csv"),
  ]);

  // 방문 추이.csv는 연간 폴더에서는 연도(2020~2025) 단위로 이미 집계돼 있다.
  const visit = new Map<number, number>();
  for (const cols of visitRows) {
    if (cols[1] !== visitKey) continue;
    const year = Number(cols[0]);
    if (year < 2020) continue;
    visit.set(year, Number(cols[4]));
  }

  // 관광소비 추이.csv는 연간 폴더에서도 월별(2018-01~2025-12)이라, 연도별 12개월 평균으로 직접 집계한다.
  const spendByYear = new Map<number, number[]>();
  for (const cols of spendRows) {
    if (cols[1] !== spendKey) continue;
    const year = Number(cols[0].slice(0, 4));
    if (year < 2020) continue;
    const arr = spendByYear.get(year) ?? [];
    arr.push(Number(cols[3]));
    spendByYear.set(year, arr);
  }
  const spend = new Map<number, number>();
  for (const [year, values] of spendByYear) {
    spend.set(year, values.reduce((a, b) => a + b, 0) / values.length);
  }
  return { visit, spend };
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

export default async function CountryMonthlySeasonalityPage() {
  const perCountry = await Promise.all(
    COUNTRIES.map(async (c) => {
      const { visit, spend } = await loadMonthlySeries(c.folder, c.visitKey, c.spendKey);
      return { ...c, visit, spend };
    })
  );

  const visitSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: MONTHS.map((m) => ({ year: m, value: c.visit.get(m) ?? 0 })),
  }));
  const spendSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: MONTHS.map((m) => ({ year: m, value: c.spend.get(m) ?? 0 })),
  }));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        국가별 월별 방한 성수기 — 마케팅 타이밍
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/7&lt;국가&gt;월간/2025 · 방문 추이.csv(서울 방문 외국인 중 해당 국가 비율),
        관광소비 추이.csv(서울 관광소비 중 해당 국가 비율) · 6개국(일본·중국·미국·대만·태국·홍콩)의
        2025년 월별 비율을 비교해 “어느 국가를 몇 월에 겨냥할지” 판단하는 데 씁니다.
      </p>
      <InsightBox
        items={[
          "중국(8월 27.8%)과 미국(6월 14.4%)은 여름에 방문이 몰리는 반면, 일본(3월 23.1%)·대만(2월 12.9%)·홍콩(2월 7.2%)은 겨울~봄에 몰려 계절이 뚜렷하게 갈립니다 — 여름·겨울 캠페인을 국가별로 나눠 배치할 수 있습니다.",
          "미국은 방문 비율(6월 14.4%, 6개국 중 3위)보다 관광소비 비율(6월 22.2%, 압도적 1위)이 훨씬 높습니다 — '적게 오지만 많이 쓰는' 고소비 시장이라 방문객 수보다 소비액 기준으로 마케팅 우선순위를 매기면 결과가 달라집니다.",
          "홍콩(방문 2월 · 소비 7월)과 태국(방문 12월 · 소비 4월)은 방문이 몰리는 달과 소비가 몰리는 달이 서로 다릅니다 — 다만 두 나라 모두 전체 비중이 3~7%대로 작아 월별 변동 폭이 과장돼 보일 수 있다는 점은 감안해야 합니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <SeasonalityChart visitSeries={visitSeries} spendSeries={spendSeries} />
      </div>
    </div>
  );
}
