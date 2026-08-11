import NeighborhoodBoard from "./NeighborhoodBoard";
import { ANNUAL_ROOT, MONTHLY_ROOT, loadPopularNeighborhoodRegions } from "../../_data/popularNeighborhoods";

export default async function PopularNeighborhoodsDemoPage() {
  const [annual, monthly] = await Promise.all([
    loadPopularNeighborhoodRegions(ANNUAL_ROOT),
    loadPopularNeighborhoodRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        인기 소비동네 — 추이 + 순위표
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        기존 2개 페이지(medicalPopularNeighborhoods 멀티라인 추이 · medicalPopularNeighborhoodsRanking
        기간별 순위표)를 하나로 합쳤습니다. 두 페이지는 <b>같은 데이터를 다른 방식으로 볼 뿐</b>이라
        컨트롤(지역 · 기간 · 지표)을 공유하고, 위에 추이 차트를 아래에 순위표를 함께 놓아
        “언제 뒤집혔는지”(차트)와 “정확히 몇 %였는지”(표)를 한 화면에서 확인합니다. 출처:
        data/5_연간2018-2026, data/5_월간2025.
      </p>

      <div
        style={{
          background: "#F4F8F6",
          border: "1px solid #D6E7E1",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C6B", letterSpacing: "0.04em", marginBottom: 8 }}>
          시사점
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "#25303B" }}>
          <li>
            <b>[소비건수 · 서울]</b> 1위가 2024년에 교체됐습니다 — 2018~2023년 6년 연속 강남 역삼1동이
            1위였는데 2024년부터 중구 명동이 역전해 2026년 42.5%까지 격차를 벌렸습니다. 상단 “1위 교체”
            카드가 그 시점을 바로 짚어줍니다.
          </li>
          <li>
            <b>[소비건수 · 서울]</b> 강남 논현1동은 2018년 18.6%(3위)에서 2026년 7.0%(5위)로 계속 밀려난
            반면, 마포 서교동은 12.8%(5위)에서 23.7%(2위)로 올라섰습니다 — 차트에서 선이 교차하는 지점이
            순위 역전 시점입니다.
          </li>
          <li>
            <b>[소비액 · 서울]</b> 지표를 바꾸면 순위가 완전히 달라집니다 — 소비액 1위는 신사동(2018) →
            서초4동(2024~2026)이고, 명동은 소비액 기준으로는 2018년 5위(7.9%)에서 2026년 2위(24.2%)로
            올라섰습니다. “많이 방문하는 동네”와 “돈을 많이 쓰는 동네”가 일치하지 않습니다.
          </li>
          <li>
            전국 폴더의 동일 파일은 시군구/행정동이 아니라 시도 단위 랭킹이라(컬럼 구조가 다름) 지역
            목록에서 제외했습니다 — 17개 시도만 선택할 수 있습니다.
          </li>
        </ul>
      </div>

      <NeighborhoodBoard annual={annual} monthly={monthly} />
    </div>
  );
}
