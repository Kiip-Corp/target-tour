import { readFile } from "node:fs/promises";
import path from "node:path";
import IndexedTrendChart, { type RawPoint } from "./IndexedTrendChart";
import InsightBox from "../InsightBox";

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
      <InsightBox
        items={[
          "소비건수·소비액 모두 2018→2025년 사이 약 5.7~5.8배로 거의 같은 배율로 성장했습니다(668,665건→3,832,383건, 2.96억원→17.2억원) — 건당 평균 소비액 자체는 크게 변하지 않았다는 뜻입니다.",
          "2020~2021년 코로나 시기 급감(2019년 대비 약 40% 수준) 이후 2022년부터 매년 뚜렷하게 반등하는 회복 흐름이 이어지고 있습니다.",
          "2026년 수치가 2025년보다 낮게 보이는데, 이는 감소가 아니라 조회 시점(2026년 8월) 기준 연간 데이터가 아직 다 채워지지 않았기 때문일 가능성이 큽니다 — 연도 간 비교 시 2026년은 부분 연도로 보는 게 안전합니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <IndexedTrendChart
          annual={{ count: annualCount, amount: annualAmount }}
          monthly={{ count: monthlyCount, amount: monthlyAmount }}
        />
      </div>
    </div>
  );
}
