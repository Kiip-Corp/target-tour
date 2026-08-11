import PopularNeighborhoodRankingClient from "./PopularNeighborhoodRankingClient";
import { ANNUAL_ROOT, MONTHLY_ROOT, loadPopularNeighborhoodRegions } from "../../_data/popularNeighborhoods";
import InsightBox from "../InsightBox";

export default async function MedicalPopularNeighborhoodsRankingPage() {
  const [annual, monthly] = await Promise.all([
    loadPopularNeighborhoodRegions(ANNUAL_ROOT),
    loadPopularNeighborhoodRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        지역별 의료소비 - 인기 소비동네 (순위표)
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        medicalPopularNeighborhoods와 같은 데이터를 멀티라인 대신 기간별 순위표로 보여줍니다 —
        hover 없이 모든 기간·순위의 값을 한 번에 확인할 수 있습니다. 지역(기본 서울), 연간
        (2018–2026)/월간(2025) 토글은 동일하게 유지됩니다.
      </p>
      <InsightBox
        items={[
          "순위표로 보면 1위 교체 시점이 명확합니다 — 서울 기준 역삼1동(2018~2023 1위) → 명동(2024~2026 1위)으로 뒤바뀐 해가 정확히 2024년임을 표에서 바로 확인할 수 있습니다.",
          "그래프(멀티라인)로는 5개 라인이 겹쳐 순간 순위를 읽기 어렵지만, 순위표는 매 기간의 1~5위를 즉시 보여줘 '어느 동네가 언제 1위였는지' 같은 질문에 더 적합합니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <PopularNeighborhoodRankingClient annual={annual} monthly={monthly} />
      </div>
    </div>
  );
}
