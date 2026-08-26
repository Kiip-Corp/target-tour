import MarketingBoard from "./MarketingBoard";
import { loadMedicalRegions, loadTourData } from "./data";

export default async function MarketingBoardPage() {
  const [tour, medical] = await Promise.all([loadTourData(), loadMedicalRegions()]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        타깃 마케팅 의사결정 보드 — 언제 · 어디에 · 누구를
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        위에서 타깃 국가·연도·방문지를 고르면 ① 몇 월에 가장 많이 오고/쓰고/치료받는지, ② 전국
        어느 지역에 가는지, ③ 성수기가 지역마다 어떻게 다른지, ④ 의료관광 소비가 어느 지역에
        몰리는지를 한 화면에서 확인합니다. 6개국(일본·중국·미국·대만·태국·홍콩) 기준이며, 데이터
        출처는 7번(방문·관광소비), 4번(국가별 의료 소비액), 5번(지역별 의료 소비)입니다.
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
          ⚠ 데이터 읽는 법 — 관광은 3중 교차가 되고, 의료는 아직 안 됩니다
        </b>
        7번 월간 자료를 <b>전국 17개 시도</b>로 다시 받아, 관광 쪽은{" "}
        <b>국가 × 지역 × 월</b> 3중 교차가 가능해졌습니다(패널 1~3). 다만 데이터랩은 시도별{" "}
        <b>&ldquo;전체 외국인&rdquo; 절대값</b>과 그중 <b>해당 국가 비율(%)</b>을 따로 주기 때문에,
        국가별 방문자 수·관광소비액은 둘을 곱한 <b>추정치</b>입니다(연 단위로 합산하면 데이터랩의
        연간 지역분포 비율과 소수점 첫째 자리까지 일치합니다). 의료는 여전히 축이 하나씩 빕니다 —
        ① 4번(국가별 의료 소비액)은 <b>전국 합계</b>라 지역을 나눌 수 없고, ② 5번(지역별 의료
        소비)은 <b>국가 구분이 없는</b> 전체 외국인 합계입니다. 그래서 패널 1의 의료소비 선과
        패널 4는 선택한 방문지·타깃 국가와 교차되지 않습니다. 의료까지 3중 교차하려면
        &ldquo;국가별 × 지역별 × 월별 의료 소비&rdquo; 원자료를 추가로 받아야 합니다.
        <br />
        2026년은 상반기까지만 제공되며, 2026.07 시도 개편(전남광주통합특별시 출범)으로 광주·전남은
        2026년 6월까지만 집계됩니다.
      </div>

      <MarketingBoard tour={tour} medical={medical} />
    </div>
  );
}
