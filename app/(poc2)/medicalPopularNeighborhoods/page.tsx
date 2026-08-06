import PopularNeighborhoodClient from "./PopularNeighborhoodClient";
import { ANNUAL_ROOT, MONTHLY_ROOT, loadPopularNeighborhoodRegions } from "../popularNeighborhoodsData";

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
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <PopularNeighborhoodClient annual={annual} monthly={monthly} />
      </div>
    </div>
  );
}
