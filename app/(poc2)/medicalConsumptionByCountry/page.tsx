import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { type NamedSeries } from "../../_components/MultiLineChart";
import MedicalConsumptionByCountryChart from "./MedicalConsumptionByCountryChart";
import InsightBox from "../InsightBox";

// dataviz 스킬 검증 팔레트(라이트) — foreignPatientsByCountry와 동일한 슬롯 1~5 재사용,
// 홍콩은 이 차트에만 나오므로(다른 차트와 동시에 안 보임) 슬롯 6(green)을 새로 배정
const COUNTRY_ORDER: { label: string; color: string }[] = [
  { label: "일본", color: "#2a78d6" },
  { label: "중국", color: "#eb6834" },
  { label: "미국", color: "#1baf7a" },
  { label: "대만", color: "#eda100" },
  { label: "태국", color: "#e87ba4" },
  { label: "홍콩", color: "#008300" },
];

async function findCsv(dir: string, suffix: string) {
  // macOS(APFS)는 파일명을 NFD로 저장해 NFC 리터럴과 바이트가 달라진다 — 정규화 후 비교.
  const entries = await readdir(dir);
  const normalizedSuffix = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(normalizedSuffix));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function loadCountry(country: string): Promise<{ label: string; points: { year: number; value: number }[] }> {
  const dir = path.join(process.cwd(), "data", "4_연간2018-2026", country);
  const file = await findCsv(dir, `${country} 외국인 소비액 추이.csv`);
  const raw = await readFile(file, "utf-8");
  const points = raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [, year, value] = line.split(",");
      return { year: Number(year), value: Number(value) };
    });
  return { label: country, points };
}

// data/4<국가>월간/<연도별 다운로드 폴더>/…소비액 추이.csv
// 연간과 같은 컬럼(국가명,기준연월,소비금액)이고 기준연월만 YYYYMM이다. 연도별로 폴더가
// 나뉘어 있어 전부 합쳐 하나의 연속 시계열(201801~202606, 102개월)로 만든다.
// point.year에는 YYYYMM 정수를 그대로 담는다(월간 모드의 x축 키).
async function loadCountryMonthly(country: string): Promise<{ label: string; points: { year: number; value: number }[] }> {
  const root = path.join(process.cwd(), "data", `4${country}월간`);
  const subdirs = (await readdir(root, { withFileTypes: true }))
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  const byYearMonth = new Map<number, number>();
  await Promise.all(
    subdirs.map(async (sub) => {
      const file = await findCsv(path.join(root, sub), `${country} 외국인 소비액 추이.csv`);
      const raw = await readFile(file, "utf-8");
      for (const line of raw.replace(/^﻿/, "").trim().split("\n").slice(1)) {
        const [, yearMonth, value] = line.split(",");
        byYearMonth.set(Number(yearMonth), Number(value));
      }
    })
  );

  const points = [...byYearMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([yearMonth, value]) => ({ year: yearMonth, value }));
  return { label: country, points };
}

export default async function MedicalConsumptionByCountryPage() {
  const [loadedAnnual, loadedMonthly] = await Promise.all([
    Promise.all(COUNTRY_ORDER.map((c) => loadCountry(c.label))),
    Promise.all(COUNTRY_ORDER.map((c) => loadCountryMonthly(c.label))),
  ]);
  const years = [...new Set(loadedAnnual.flatMap((c) => c.points.map((p) => p.year)))].sort((a, b) => a - b);
  // 월간 x축 키(YYYYMM) 전체 목록 — 셀렉트박스의 선택 가능한 연·월도 여기서 파생시킨다.
  const yearMonths = [...new Set(loadedMonthly.flatMap((c) => c.points.map((p) => p.year)))].sort((a, b) => a - b);

  const annualSeries: NamedSeries[] = COUNTRY_ORDER.map(({ label, color }) => {
    const found = loadedAnnual.find((c) => c.label === label)!;
    return { label, color, points: found.points };
  });
  const monthlySeries: NamedSeries[] = COUNTRY_ORDER.map(({ label, color }) => {
    const found = loadedMonthly.find((c) => c.label === label)!;
    return { label, color, points: found.points };
  });

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>국가별 외국인 의료 소비액 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/4_연간2018-2026(연간 기준, 2018~2026년), data/4&lt;국가&gt;월간(월간 기준,
        2018-01~2026-06)/…소비액 추이.csv · 국가 6개(일본·중국·미국·대만·태국·홍콩) 전부 기본
        표시, 범례 버튼으로 켜고 끌 수 있습니다. 위 셀렉트박스로 기간 유형(연간/월간)과 조회
        구간의 시작·종료 시점을 고를 수 있습니다 — 월 선택은 월간 기준일 때만 활성화되며,
        2026년은 6월까지만 있어 그 해의 월 목록도 1~6월만 표시됩니다.
      </p>
      <InsightBox
        items={[
          "[연간] 국가별 순위가 완전히 재편됐습니다 — 2018년 1위는 중국(1.25억원)이었지만 2025년엔 미국(3.79억원)이 1위, 일본(3.15억원)이 2위로 올라섰고 중국은 4위(2.25억원)로 밀려났습니다.",
          "[연간] 대만이 168배(138만원→2.3억원)로 압도적으로 가장 가파르게 성장했고, 일본도 14.5배 성장한 반면 중국은 1.8배로 6개국 중 가장 더디게 늘었습니다.",
          "[연간] 2018년엔 대만이 6개국 중 소비액이 가장 적었지만(138만원) 2025년엔 3위(2.3억원)까지 올라 순위 하위권과 상위권이 뒤바뀐 대표 사례입니다.",
          "[월간] 2025년 기준 일본·중국·대만·태국·홍콩 5개국 모두 12월에 의료 소비액이 가장 많고, 미국만 11월이 피크입니다 — 대부분 국가가 연말에 소비가 몰리는 뚜렷한 패턴입니다.",
          "[월간] 2025년 국가 간 격차가 연중 내내 큽니다 — 최고월인 미국 11월(4210만원)이 최저월인 태국 8월(190만원)의 22배에 달합니다.",
          "[월간] 2026년 상반기(1~6월)는 6개국 모두 전년 동기 대비 늘었고, 특히 중국이 +172%(1.02억→2.78억원)로 압도적입니다 — 다만 2026년 데이터는 6월까지만 있어 연간 기준과 직접 비교할 수 없습니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <MedicalConsumptionByCountryChart
          annualSeries={annualSeries}
          monthlySeries={monthlySeries}
          years={years}
          yearMonths={yearMonths}
        />
      </div>
    </div>
  );
}
