import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

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

const DEFAULT_VISIBLE = COUNTRY_ORDER.map((c) => c.label);

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

export default async function MedicalConsumptionByCountryPage() {
  const loaded = await Promise.all(COUNTRY_ORDER.map((c) => loadCountry(c.label)));
  const years = [...new Set(loaded.flatMap((c) => c.points.map((p) => p.year)))].sort((a, b) => a - b);

  const series: NamedSeries[] = COUNTRY_ORDER.map(({ label, color }) => {
    const found = loaded.find((c) => c.label === label)!;
    return { label, color, points: found.points };
  });

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>국가별 외국인 의료 소비액 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/4_연간2018-2026/&lt;국가&gt;/…소비액 추이.csv · 국가 6개(일본·중국·미국·대만·태국·홍콩) 전부
        기본 표시, 위 버튼으로 켜고 끌 수 있습니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <MultiLineChart
          series={series}
          years={years}
          defaultVisible={DEFAULT_VISIBLE}
          groupLabel="국가"
          valueLabel="의료 소비액 (원)"
        />
      </div>
    </div>
  );
}
