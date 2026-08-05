import { readFile } from "node:fs/promises";
import path from "node:path";
import IndexedTrendChart, { type RawPoint } from "./IndexedTrendChart";

async function loadCsv(...segments: string[]): Promise<RawPoint[]> {
  const file = path.join(process.cwd(), "data", ...segments);
  const raw = await readFile(file, "utf-8");
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      return { period: cols[0].trim(), value: Number(cols[cols.length - 1]) };
    });
}

export default async function MedicalConsumptionTrendPage() {
  const [annualCount, annualAmount, monthlyCount, monthlyAmount] = await Promise.all([
    loadCsv("3_연간2018-2026", "3-1외국인 의료 소비건수(전체) 추이.csv"),
    loadCsv("3_연간2018-2026", "3-4외국인 의료 소비액(전체) 추이.csv"),
    loadCsv("3_월간2025", "3-1외국인 의료 소비건수(전체) 추이.csv"),
    loadCsv("3_월간2025", "3-4외국인 의료 소비액(전체) 추이.csv"),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        외국인 의료 소비 추이 (건수 · 금액)
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        3-1(소비건수 전체 추이) · 3-4(소비액 전체 추이) · 두 지표는 단위·규모가 달라(건 vs 원) 한
        축에 그대로 겹치면 한쪽이 눌려 보이므로, 각 지표를 첫 기간(연간=2018, 월간=2025.01) 값을
        100으로 둔 지수로 환산해 표시합니다. 실제 값은 hover 또는 표에서 확인할 수 있습니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <IndexedTrendChart
          annual={{ count: annualCount, amount: annualAmount }}
          monthly={{ count: monthlyCount, amount: monthlyAmount }}
        />
      </div>
    </div>
  );
}
