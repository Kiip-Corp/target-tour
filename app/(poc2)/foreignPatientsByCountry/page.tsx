import { readFile } from "node:fs/promises";
import path from "node:path";
import MultiLineChart, { type NamedSeries } from "../MultiLineChart";

// dataviz 스킬 검증 팔레트(라이트) — 고정 순서, 국가별 색상 불변
const COUNTRY_ORDER: { label: string; color: string }[] = [
  { label: "일본", color: "#2a78d6" },
  { label: "중국", color: "#eb6834" },
  { label: "미국", color: "#1baf7a" },
  { label: "대만", color: "#eda100" },
  { label: "태국", color: "#e87ba4" },
  { label: "러시아", color: "#008300" },
  { label: "몽골", color: "#4a3aa7" },
  { label: "베트남", color: "#e34948" },
  { label: "싱가포르", color: "#0d9488" },
  { label: "캐나다", color: "#a3a300" },
];

const DEFAULT_VISIBLE = ["일본", "중국", "미국", "대만", "태국"];
const EXCLUDE = new Set(["그외국가", "합계"]);

async function loadData() {
  const file = path.join(process.cwd(), "data", "2-1국가별 외국인 환자 현황_Grid.csv");
  const raw = await readFile(file, "utf-8");
  const rows = raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [year, country, value] = line.split(",");
      return { year: Number(year), country: country.trim(), value: Number(value) };
    })
    .filter((r) => !EXCLUDE.has(r.country));

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);

  const series: NamedSeries[] = COUNTRY_ORDER.map(({ label, color }) => ({
    label,
    color,
    points: years.map((year) => ({
      year,
      value: rows.find((r) => r.year === year && r.country === label)?.value ?? 0,
    })),
  }));

  return { series, years };
}

export default async function ForeignPatientsByCountryPage() {
  const { series, years } = await loadData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>국가별 외국인 환자 현황 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        2-1국가별 외국인 환자 현황_Grid.csv · 기본 5개국(일본·중국·미국·대만·태국) 표시, 나머지
        국가는 위 버튼으로 켜고 끌 수 있습니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <MultiLineChart series={series} years={years} defaultVisible={DEFAULT_VISIBLE} />
      </div>
    </div>
  );
}
