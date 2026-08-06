import { readFile } from "node:fs/promises";
import path from "node:path";
import StackedShareChart, { type ShareRow } from "../StackedShareChart";
import InsightBox from "../InsightBox";

async function loadShares(...segments: string[]): Promise<ShareRow[]> {
  const file = path.join(process.cwd(), "data", ...segments);
  const raw = await readFile(file, "utf-8");
  const rows = raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const cols = line.split(",");
      return { period: cols[0].trim(), category: cols[1].trim(), value: Number(cols[2]) };
    });

  const periods = [...new Set(rows.map((r) => r.period))].sort();
  return periods.map((period) => ({
    period,
    shares: Object.fromEntries(
      rows.filter((r) => r.period === period).map((r) => [r.category, r.value])
    ),
  }));
}

export default async function MedicalSpecialtyMixPage() {
  const [amountAnnual, amountMonthly, countAnnual, countMonthly] = await Promise.all([
    loadShares("3_연간2018-2026", "3-2외국인 의료 소비액 진료과목별 비율 추이.csv"),
    loadShares("3_월간2025", "3-2_외국인 의료 소비액 진료과목별 비율 추이.csv"),
    loadShares("3_연간2018-2026", "3-5외국인 의료 소비건수 진료과목 비율 추이.csv"),
    loadShares("3_월간2025", "3-5_외국인 의료 소비건수 진료과목 비율 추이.csv"),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        진료과목별 외국인 의료 소비 비율 추이
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        3-2(소비액 진료과목별 비율) · 3-5(소비건수 진료과목별 비율) · 진료과목 8개의 구성비(part-to-whole)라
        멀티라인 대신 100% 누적 막대그래프로 표시합니다. 두 지표(금액·건수)는 각각 100%로 완결되는
        별개의 구성비라 한 막대에 합칠 수 없어, 같은 기간·색상 범례를 공유하는 두 패널로 나란히
        비교합니다.
      </p>
      <InsightBox
        items={[
          "건수와 금액의 1위 진료과목이 다릅니다 — 소비건수는 약국이 2018년 44.9%→2025년 58.6%로 꾸준히 1위인 반면, 소비액은 피부과가 17.6%→54.5%로 3배 넘게 커지며 1위 자리를 차지했습니다.",
          "대학/종합병원은 금액·건수 양쪽 모두 뚜렷하게 축소됐습니다 — 금액 비중 30.0%→7.1%, 건수 비중 24.5%→6.3%로 둘 다 1/4 수준으로 줄었습니다.",
          "성형외과는 금액 비중(34.5%→23.9%)은 여전히 2위권이지만 건수 비중(6.5%→5.7%)은 낮아, 방문 빈도는 적어도 건당 소비액이 매우 높은 과목임을 보여줍니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <StackedShareChart
          amountAnnual={amountAnnual}
          amountMonthly={amountMonthly}
          countAnnual={countAnnual}
          countMonthly={countMonthly}
        />
      </div>
    </div>
  );
}
