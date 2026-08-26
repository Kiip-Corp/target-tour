import BoardTabs from "./_marketingBoard/BoardTabs";
import DataSources from "./_marketingBoard/DataSources";
import MarketingBoard from "./_marketingBoard/MarketingBoard";
import { loadMedicalRegions, loadTourData } from "./_marketingBoard/data";

export default async function MarketingBoardPage() {
  const [tour, medical] = await Promise.all([loadTourData(), loadMedicalRegions()]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        타깃 마케팅 의사결정 보드 — 언제 · 어디에 · 누구를
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        위에서 타깃 국가·연도·방문지를 고르면 ① 몇 월에 가장 많이 오고/쓰고/치료받는지, ② 전국
        어느 지역에 가는지, ③ 성수기가 지역마다 어떻게 다른지를 한 화면에서 확인합니다.
        6개국(일본·중국·미국·대만·태국·홍콩) · 17개 시도 · <b>2020년 1월 ~ 2026년 7월</b> 월간
        기준입니다.
      </p>

      <DataSources
        period="2020.01 ~ 2026.07"
        items={[
          {
            key: "tour",
            fields:
              "시도별 “전체 외국인” 방문자 수(명)·관광소비액(천원)과, 그중 각 국가가 차지하는 비율(%)",
            use: "패널 1~3 전부 — 월별 성수기, 시도별 분포, 지역 × 월 히트맵",
          },
          {
            key: "medicalCountry",
            fields: "국가별 의료 소비액(천원)·소비건수와 전체 외국인 대비 비율(%)",
            use: "패널 1의 “의료소비·국가” 선과 상단 요약 카드",
          },
          {
            key: "medicalRegion",
            fields: "시도별·전국 의료 소비액(천원)",
            use: "패널 1의 “의료소비·지역” 선",
          },
        ]}
      />

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
          ⚠ 데이터 읽는 법 — 관광은 국가 × 지역 × 월이 다 맞물리고, 의료 두 선은 축이 다릅니다
        </b>
        <b>① 관광의 국가별 값은 추정치입니다.</b> 「방문·관광소비」 자료는 시도 × 월로{" "}
        <b>&ldquo;전체 외국인&rdquo; 절대값</b>과 그중 <b>해당 국가 비율(%)</b>을 따로 줍니다.
        패널 1~3의 국가별 방문자 수·관광소비액은 이 둘을 곱해 만든 값이라, <b>국가 × 지역 × 월</b>{" "}
        3중 교차가 되는 대신 원자료가 아니라 계산값입니다(연 단위로 합산하면 데이터랩의 연간
        지역분포 비율과 소수점 첫째 자리까지 일치합니다).
        <br />
        <b>② 패널 1의 의료 두 선은 서로 다른 축입니다.</b> <b>의료소비·국가</b>는 타깃 국가의{" "}
        <b>전국</b> 합계(지역 구분이 없습니다), <b>의료소비·지역</b>은 선택 방문지의{" "}
        <b>전체 외국인</b> 합계(국가 구분이 없습니다)입니다. 그래서 &ldquo;일본인이 부산에서 쓴
        의료비&rdquo;는 이 보드에서 구할 수 없고, 두 선은 곱하거나 빼지 말고{" "}
        <b>몰리는 시점만 나란히</b> 비교하세요.
        <br />
        <b>③ 단위는 방문만 명이고, 소비 3종은 모두 천원입니다.</b> 관광소비액은 원자료에 천원으로
        표기돼 있고, 의료소비액은 표기가 없지만 소비액 ÷ 소비건수가 건당 40만원대라 같은 천원
        단위입니다. 보드는 억/조로 접어서 보여줍니다. 패널 1은 단위가 섞이므로 각 지표의{" "}
        <b>최대월을 100으로 지수화</b>한 차트라, 선의 높이는 &ldquo;몰리는 시점&rdquo;만 뜻합니다 —
        실제 금액은 위 요약 카드와 툴팁에서 보세요.
        <br />
        <b>④ 자료가 없는 칸은 0이 아니라 빈칸입니다.</b> 2026년은 7월까지 제공되고, 2026.07 시도
        개편(전남광주통합특별시 출범)으로 <b>광주·전남은 2026년 6월까지만</b> 집계됩니다. 표본이
        적어 원본에서 마스킹된 달(세종 2020년 11·12월)도 마찬가지라, 패널 1의 선은 끊기고 패널 3의
        히트맵은 빗금으로 비워둡니다.
      </div>

      <MarketingBoard tour={tour} medical={medical} />
    </div>
  );
}
