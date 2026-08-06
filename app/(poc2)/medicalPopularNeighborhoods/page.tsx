import PopularNeighborhoodClient from "./PopularNeighborhoodClient";
import { ANNUAL_ROOT, MONTHLY_ROOT, loadPopularNeighborhoodRegions } from "../popularNeighborhoodsData";
import InsightBox from "../InsightBox";

export default async function MedicalPopularNeighborhoodsPage() {
  const [annual, monthly] = await Promise.all([
    loadPopularNeighborhoodRegions(ANNUAL_ROOT),
    loadPopularNeighborhoodRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>지역별 의료소비 - 인기 소비동네</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/5_연간2018-2026, data/5_월간2025 · 시도 버튼을 누르면 해당 지역 상위 동네(최대
        5곳)의 소비 비율 추이가 멀티라인으로 렌더링됩니다. 연간(2018–2026)/월간(2025) 토글로
        기간 단위를 바꿀 수 있습니다. 전국 폴더의 동일 파일은 시군구/행정동이 아닌 시도 단위
        랭킹이라(컬럼 구조가 다름) 이 목록에서는 제외했습니다.
      </p>
      <InsightBox
        items={[
          "(서울 기준) 2018~2023년 6년 연속 강남 역삼1동이 1위였는데, 2024년부터 중구 명동이 역전해 2026년엔 42.5%까지 격차를 벌리며 확실한 1위로 자리잡았습니다.",
          "반대로 강남 논현1동은 2018년 18.6%(3위)에서 2026년 7.0%(꼴찌)로 계속 밀려났고, 마포 서교동은 최근 2년간 2위로 올라서는 등 순위 변동이 활발합니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <PopularNeighborhoodClient annual={annual} monthly={monthly} />
      </div>
    </div>
  );
}
