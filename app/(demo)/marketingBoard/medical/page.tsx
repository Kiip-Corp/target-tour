import BoardTabs from "../BoardTabs";
import { loadMedicalBoardData } from "../data";
import MedicalBoard from "./MedicalBoard";

export default async function MedicalBoardPage() {
  const data = await loadMedicalBoardData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/marketingBoard/medical" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        의료관광 보드 — 누가 · 어디에 · 무엇을
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        관광(7번)을 빼고 의료 자료만 모았습니다. ① 어느 나라 외국인이 몇 월에 치료받는지, ② 어느
        시도에 소비가 몰리는지, ③ 어느 진료과목에 쓰는지를 국가별·지역별로 나란히 놓습니다.
        데이터 출처는 4번(국가별 의료소비 추이), 5번(지역별 의료소비 추이)이며 둘 다 월간
        2020년 1월 ~ 2026년 7월입니다.
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
          ⚠ 데이터 읽는 법 — 국가와 지역은 서로 교차되지 않습니다
        </b>
        4번은 <b>국가별이되 전국 합계</b>(지역 구분 없음), 5번은 <b>지역별이되 전체 외국인</b>(국가
        구분 없음)입니다. 그래서 &ldquo;일본인이 부산에서 쓴 의료비&rdquo;는 두 자료 어느 쪽으로도
        구할 수 없습니다 — 패널 1은 국가축, 패널 2는 지역축으로 따로 읽어야 합니다. 다만 두 자료는{" "}
        <b>지표·단위가 같습니다</b>: 4번의 &ldquo;전체 외국인 대비 비율&rdquo;로 역산한 총액이 5번의
        &ldquo;전국&rdquo; 값과 일치합니다. 그래서 국가 점유율과 지역 분포를 같은 파이의 두 단면으로
        읽어도 됩니다.
        <br />
        진료과목(패널 3)은 국가 쪽만 <b>월별</b>이 있고, 지역 쪽은 조회 기간을 뭉갠 <b>연 단위
        스냅샷</b>뿐이라 기준월을 따르지 않습니다. 데이터랩의 5번 &ldquo;전국&rdquo;에는 시도가
        특정되지 않은 소비가 섞여 있어 17개 시도 합계보다 큽니다.
      </div>

      <MedicalBoard data={data} />
    </div>
  );
}
