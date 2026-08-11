import MarketingBoard from "./MarketingBoard";
import { loadCountryBoards, loadMedicalRegions } from "./data";

export default async function MarketingBoardPage() {
  const [boards, medical] = await Promise.all([loadCountryBoards(), loadMedicalRegions()]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        타깃 마케팅 의사결정 보드 — 언제 · 어디에 · 누구를
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        위에서 타깃 국가를 고르면 ① 몇 월에 가장 많이 오고/쓰고/치료받는지, ② 전국 어느 지역에
        가는지, ③ 의료관광 소비가 어느 지역에 몰리는지를 한 화면에서 확인합니다. 6개국(일본·중국·
        미국·대만·태국·홍콩) 기준이며, 데이터 출처는 7번(방문·관광소비), 4번(국가별 의료 소비액),
        5번(지역별 의료 소비)입니다.
      </p>

      <div
        style={{
          background: "#FFF8E8",
          border: "1px solid #F0DFB8",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 11.5,
          lineHeight: 1.75,
          color: "#5C4A22",
        }}
      >
        <b style={{ display: "block", marginBottom: 4, fontSize: 11 }}>
          ⚠ 데이터 한계 — “몇 월 × 어느 지역 × 어느 국가” 3중 교차는 현재 자료로 불가능합니다
        </b>
        보유 데이터는 축이 두 개씩만 맞물립니다. ① <b>국가 × 월</b>(7번 월간)은 방문지가{" "}
        <b>서울특별시로만</b> 집계돼 있어 지역을 나눌 수 없고, ② <b>국가 × 지역</b>(7번 연간
        히트맵)은 <b>월 구분이 없는</b> 연간 스냅샷이며, ③ <b>지역 × 연도</b>(5번 의료)는{" "}
        <b>국가 구분이 없는</b> 전체 외국인 합계입니다. 그래서 이 보드는 세 단면을 나란히 놓고
        각 패널이 답할 수 있는 질문의 범위를 패널마다 명시하는 방식으로 구성했습니다. 3중 교차가
        필요하면 “국가별 × 지역별 × 월별 방문/소비” 원자료를 추가로 받아야 합니다.
      </div>

      <MarketingBoard boards={boards} medical={medical} />
    </div>
  );
}
