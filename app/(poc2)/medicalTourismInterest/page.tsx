import { readFile } from "node:fs/promises";
import path from "node:path";
import LineChart from "./LineChart";

async function loadData() {
  const file = path.join(process.cwd(), "data", "1-의료관광 관심도 추이.csv");
  const raw = await readFile(file, "utf-8");
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [ym, value] = line.split(",");
      return { ym: ym.trim(), value: Number(value) };
    });
}

export default async function MedicalTourismInterestPage() {
  const data = await loadData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>의료관광 관심도 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        1-의료관광 관심도 추이.csv · 구글 트렌드 기반 한국 의료관광 관심도 지수(0–100) · d3로 그린
        꺾은선 그래프
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 16 }}>
        <LineChart data={data} />
      </div>
    </div>
  );
}
