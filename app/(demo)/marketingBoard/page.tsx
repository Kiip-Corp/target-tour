import BoardTabs from "./BoardTabs";
import MarketingBoard from "./MarketingBoard";
import { loadMedicalRegions, loadTourData } from "./data";

export default async function MarketingBoardPage() {
  const [tour, medical] = await Promise.all([loadTourData(), loadMedicalRegions()]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/marketingBoard" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        타깃 마케팅 의사결정 보드 — 언제 · 어디에 · 누구를
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        위에서 타깃 국가·연도·방문지를 고르면 ① 몇 월에 가장 많이 오고/쓰고/치료받는지, ② 전국
        어느 지역에 가는지, ③ 성수기가 지역마다 어떻게 다른지를 한 화면에서 확인합니다.
        6개국(일본·중국·미국·대만·태국·홍콩) · 17개 시도 · <b>2020년 1월 ~ 2026년 7월</b> 월간
        기준이며, 출처는 7번(방문·관광소비), 4번(국가별 의료소비), 5번(지역별 의료소비)입니다.
        의료 자료만 파고드는 화면은 위 탭의 <b>② 의료관광</b> 보드입니다.
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
          ⚠ 데이터 읽는 법 — 관광은 3중 교차가 되고, 의료는 국가 · 지역 중 하나만 맞물립니다
        </b>
        <b>① 관광(7번)의 국가별 값은 추정치입니다.</b> 데이터랩은 시도 × 월로 <b>&ldquo;전체
        외국인&rdquo; 절대값</b>과 그중 <b>해당 국가 비율(%)</b>을 따로 주기 때문에, 패널 1~3의
        국가별 방문자 수·관광소비액은 둘을 곱해 만듭니다. 덕분에 <b>국가 × 지역 × 월</b> 3중 교차가
        되지만, 값은 원자료가 아니라 계산값입니다(연 단위로 합산하면 데이터랩의 연간 지역분포
        비율과 소수점 첫째 자리까지 일치합니다).
        <br />
        <b>② 의료(4·5번)는 국가와 지역이 교차되지 않습니다.</b> 4번(국가별)은{" "}
        <b>지역 구분이 없는</b> 전국 합계, 5번(지역별)은 <b>국가 구분이 없는</b> 전체 외국인
        합계라, &ldquo;일본인이 부산에서 쓴 의료비&rdquo;는 어느 쪽으로도 구할 수 없습니다. 그래서
        이 보드에서 의료가 나오는 곳은 패널 1뿐이고, 거기서도 두 선을 <b>나란히 놓기만</b> 합니다
        (<b>의료소비·국가</b> = 타깃 국가 · 전국, <b>의료소비·지역</b> = 선택 방문지 · 전체 외국인).
        다만 두 자료는 지표·단위가 같아서 — 4번의 비율로 역산한 전체 외국인 소비액이 5번의{" "}
        <b>&ldquo;전국&rdquo;</b> 값과 일치합니다 — 같은 파이의 두 단면으로 읽어도 됩니다. 국가 ×
        지역까지 곱하려면 &ldquo;국가별 × 지역별 × 월별&rdquo; 원자료가 따로 필요합니다.
        <br />
        <b>③ 단위는 방문만 명이고, 소비 3종은 모두 천원입니다.</b> 관광소비액은 원자료에 천원으로
        표기돼 있고, 의료소비액은 표기가 없지만 소비액 ÷ 소비건수가 건당 40만원대라 같은 천원
        단위입니다(신한카드 소비 기준). 보드는 억/조로 접어서 보여줍니다. 패널 1은 단위가 섞이므로
        각 지표의 <b>최대월을 100으로 지수화</b>한 차트라, 선의 높이는 &ldquo;몰리는 시점&rdquo;만
        뜻합니다 — 실제 금액은 위 요약 카드와 툴팁에서 보세요.
        <br />
        <b>④ 자료가 없는 칸은 0이 아니라 빈칸입니다.</b> 2026년은 7월까지 제공되고, 2026.07 시도
        개편(전남광주통합특별시 출범)으로 <b>광주·전남은 2026년 6월까지만</b> 집계됩니다. 표본이
        적어 원본에서 마스킹된 달(세종 2020년 11·12월)도 마찬가지라, 패널 1의 선은 끊기고 패널 3의
        히트맵은 빗금으로 비워둡니다.
        <br />
        <b>⑤ 지역별 의료 소비 지도·랭킹은 ② 의료관광 보드에 있습니다</b> — 진료과목 구성과 함께
        보는 편이 읽기 쉬워 그쪽으로 옮겼고, 여기에는 패널 1의 추이선만 남겼습니다.
      </div>

      <MarketingBoard tour={tour} medical={medical} />
    </div>
  );
}
