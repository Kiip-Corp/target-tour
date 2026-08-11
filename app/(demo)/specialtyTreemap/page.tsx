import SpecialtyTreemap from "./SpecialtyTreemap";
import { loadSpecialtyData } from "./data";

export default async function SpecialtyTreemapPage() {
  const data = await loadSpecialtyData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        진료과목별 외국인 의료소비 비율 — 트리맵
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        기존 3개 페이지(medicalSpecialtyMix 연도·월별 추이 · medicalSpecialtyOverall 누적 스냅샷 ·
        medicalSpecialtyByRegion 지역별)를 <b>지역 · 기간</b> 컨트롤 하나로 합치고,{" "}
        <b>소비액과 소비건수를 좌우에 나란히</b> 놓아 두 지표를 바로 대조할 수 있게 했습니다.
        진료과목 8개는 합이 100%인 구성비(part-to-whole)라 사각형 면적이 그대로 비중이 됩니다 —
        사각형에 마우스를 올리면 두 지표 비율이 함께 뜨고, 클릭하면 같은 과목이 좌우 양쪽에서
        동시에 강조되며 아래에 순위까지 고정 비교됩니다. 출처: data/3_연간2018-2026,
        data/3_월간2025(전국), data/5_연간2018-2026, data/5_월간2025(지역별).
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
            좌우 두 트리맵의 1위가 서로 다릅니다 — 소비액은 피부과(전체기간 43.8%)가, 소비건수는
            약국(55.2%)이 1위입니다. 돈은 피부과에서 쓰고 방문은 약국에서 하는 구조입니다.
          </li>
          <li>
            성형외과를 클릭하면 금액 26.8% vs 건수 6.0%로 20.8%p 차이가 바로 보입니다 — 방문 빈도는 낮지만
            건당 단가가 압도적으로 높은 과목입니다.
          </li>
          <li>
            지역을 바꾸면 성형외과 편중이 드러납니다 — 서울은 소비액의 29.0%가 성형외과인데 부산은 8.3%로
            3.5배 차이가 납니다.
          </li>
          <li>
            기간을 전체기간 → 2025년으로 바꾸면 쏠림이 강해지는 추세가 보입니다 — 피부과 금액 비중이
            43.8%에서 54.5%로 10.7%p 올랐고, 대학/종합병원은 12.6%에서 7.1%로 줄었습니다.
          </li>
        </ul>
      </div>

      <SpecialtyTreemap data={data} />
    </div>
  );
}
