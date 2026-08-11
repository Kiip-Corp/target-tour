import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import SeasonalityChart from "./SeasonalityChart";
import InsightBox from "../InsightBox";
import type { NamedSeries } from "../../_components/MultiLineChart";

const DATA_ROOT = path.join(process.cwd(), "data");

// 일본=blue, 중국=orange, 미국=aqua, 대만=yellow, 태국=magenta, 홍콩=green —
// app/(poc2)/medicalConsumptionByCountry/page.tsx와 같은 색 배정(같은 6개국, 앱 전체 일관성).
const COUNTRIES = [
  { monthlyFolder: "일본월간2020", annualFolder: "일본연간", label: "일본", visitKey: "일본인", spendKey: "일본", color: "#2a78d6" },
  { monthlyFolder: "중국월간2020", annualFolder: "중국연간", label: "중국", visitKey: "중국인", spendKey: "중국", color: "#eb6834" },
  { monthlyFolder: "미국월간2020", annualFolder: "미국연간", label: "미국", visitKey: "미국인", spendKey: "미국", color: "#1baf7a" },
  { monthlyFolder: "대만월간2020", annualFolder: "대만연간", label: "대만", visitKey: "대만인", spendKey: "대만", color: "#eda100" },
  { monthlyFolder: "태국월간", annualFolder: "태국연간", label: "태국", visitKey: "태국인", spendKey: "태국", color: "#e87ba4" },
  { monthlyFolder: "홍콩월간", annualFolder: "홍콩연간", label: "홍콩", visitKey: "홍콩인", spendKey: "홍콩", color: "#008300" },
];

const MONTHLY_YEARS = [2020, 2021, 2022, 2023, 2024, 2025];

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

// 월간 폴더는 연도별 하위 폴더(2020~2025)에 각각 12개월치 파일이 나뉘어 있어, 전부 합쳐
// "YYYYMM(예: 202003) → 값" 하나의 연속 시계열로 만든다 — 셀렉트박스로 임의의 시작~종료
// 월을 고르려면 연도 하나로 끊긴 데이터가 아니라 이렇게 이어붙인 전체 구간이 필요하다.
async function loadMonthlyAll(
  monthlyFolderSuffix: string,
  visitKey: string,
  spendKey: string
): Promise<{ visit: Map<number, number>; spend: Map<number, number> }> {
  const dir = await findDataDir(monthlyFolderSuffix);
  const visit = new Map<number, number>();
  const spend = new Map<number, number>();

  await Promise.all(
    MONTHLY_YEARS.map(async (year) => {
      const yearDir = path.join(dir, String(year));
      // 대만·태국의 2023 폴더처럼 실제로 비어 있는 연도가 있다(원본 데이터 수집 누락으로 보임) —
      // 이런 경우는 크래시시키지 않고 해당 연도만 건너뛴다. 그 외 사유로 파일을 못 찾는 경우와
      // 구분하기 위해, 디렉터리 자체가 비어 있을 때만 조용히 넘어가고 그 외 에러는 그대로 던진다.
      const dirFiles = await readdir(yearDir).catch(() => []);
      if (dirFiles.filter((f) => !f.startsWith(".")).length === 0) return;

      const [visitRows, spendRows] = await Promise.all([
        readRows(yearDir, "방문 추이.csv"),
        readRows(yearDir, "관광소비 추이.csv"),
      ]);
      for (const cols of visitRows) {
        if (cols[1] !== visitKey) continue;
        visit.set(Number(cols[0]), Number(cols[4]));
      }
      for (const cols of spendRows) {
        if (cols[1] !== spendKey) continue;
        spend.set(Number(cols[0]), Number(cols[3]));
      }
    })
  );
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

const YEARS = [2020, 2021, 2022, 2023, 2024, 2025];
// YYYYMM 정수로 인코딩한 전체 월 목록(202001~202512, 72개) — 셀렉트박스 옵션과 x축 도메인에 쓴다.
const YEAR_MONTHS = MONTHLY_YEARS.flatMap((y) => Array.from({ length: 12 }, (_, i) => y * 100 + i + 1));

export default async function CountryMonthlySeasonalityPage() {
  const perCountry = await Promise.all(
    COUNTRIES.map(async (c) => {
      const [monthly, annual] = await Promise.all([
        loadMonthlyAll(c.monthlyFolder, c.visitKey, c.spendKey),
        loadAnnual(c.annualFolder, c.visitKey, c.spendKey),
      ]);
      return { ...c, monthly, annual };
    })
  );

  // 대만·태국 2023처럼 원본 데이터 자체가 비어 있는 달은 0으로 채우지 않고 아예 점을 만들지
  // 않는다 — 0으로 채우면 "그 나라가 그 시기에 방문객이 0이었다"는 잘못된 신호가 된다.
  // MultiLineChart는 각 시리즈가 x축(전체 72개월) 중 일부만 가져도 있는 점끼리만 이어 그린다.
  const monthlyVisitSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: YEAR_MONTHS.filter((ym) => c.monthly.visit.has(ym)).map((ym) => ({
      year: ym,
      value: c.monthly.visit.get(ym)!,
    })),
  }));
  const monthlySpendSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: YEAR_MONTHS.filter((ym) => c.monthly.spend.has(ym)).map((ym) => ({
      year: ym,
      value: c.monthly.spend.get(ym)!,
    })),
  }));
  const annualVisitSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: YEARS.map((y) => ({ year: y, value: c.annual.visit.get(y) ?? 0 })),
  }));
  const annualSpendSeries: NamedSeries[] = perCountry.map((c) => ({
    label: c.label,
    color: c.color,
    points: YEARS.map((y) => ({ year: y, value: c.annual.spend.get(y) ?? 0 })),
  }));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        국가별 방한 성수기 — 마케팅 타이밍
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/7&lt;국가&gt;월간(2020~2025년 72개월), data/7&lt;국가&gt;연간(2020~2025년) · 방문
        추이.csv(서울 방문 외국인 중 해당 국가 비율), 관광소비 추이.csv(서울 관광소비 중 해당
        국가 비율) · 6개국(일본·중국·미국·대만·태국·홍콩)을 월간 기준(2020-01~2025-12 중 원하는
        구간)과 연간 기준(2020~2025년 중 원하는 구간) 두 기간 필터로, 시작·종료를 셀렉트박스로
        직접 골라 비교해 “어느 국가를 언제 겨냥할지” 판단하는 데 씁니다. 연간 기준의 관광소비
        비율은 해당 연도 12개월 평균입니다.
      </p>
      <InsightBox
        items={[
          "[월간] 중국(8월 27.8%)과 미국(6월 14.4%)은 여름에 방문이 몰리는 반면, 일본(3월 23.1%)·대만(2월 12.9%)·홍콩(2월 7.2%)은 겨울~봄에 몰려 계절이 뚜렷하게 갈립니다 — 여름·겨울 캠페인을 국가별로 나눠 배치할 수 있습니다.",
          "[월간] 미국은 방문 비율(6월 14.4%, 6개국 중 3위)보다 관광소비 비율(6월 22.2%, 압도적 1위)이 훨씬 높습니다 — '적게 오지만 많이 쓰는' 고소비 시장이라 방문객 수보다 소비액 기준으로 마케팅 우선순위를 매기면 결과가 달라집니다.",
          "[연간] 2020~2021년은 코로나로 전체 방한객 수 자체가 급감해 국가별 비중이 왜곡돼 있습니다 — 예를 들어 미국 소비 비중이 2021년 43.9%까지 치솟은 건 성장이 아니라 다른 나라 관광객이 거의 없었던 결과입니다. 연도별 추세는 2022년 이후로 보는 게 안정적입니다.",
          "[연간] 2022년 이후로 보면 대만(소비 비중 1.9%→10.2%)·홍콩(4.1%→5.5%)·일본(6.5%→15.2%)은 꾸준히 성장한 반면, 미국(35.8%→19.3%)은 뚜렷한 하락세입니다 — 성장하는 국가에 마케팅을 더 투자할 근거가 됩니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <SeasonalityChart
          monthlyVisitSeries={monthlyVisitSeries}
          monthlySpendSeries={monthlySpendSeries}
          annualVisitSeries={annualVisitSeries}
          annualSpendSeries={annualSpendSeries}
        />
      </div>
    </div>
  );
}
