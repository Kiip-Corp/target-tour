import BoardTabs from "../_marketingBoard/BoardTabs";
import DataSources from "../_marketingBoard/DataSources";
import { loadMedicalBoardData } from "../_marketingBoard/data";
import MedicalBoard from "../_marketingBoard/medical/MedicalBoard";

export default async function MedicalBoardPage() {
  const data = await loadMedicalBoardData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/medical" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        의료관광 보드 — 누가 · 어디에 · 무엇을
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 14, lineHeight: 1.7 }}>
        의료 자료만 모은 보드입니다. ① 어느 나라 외국인이 몇 월에 치료받는지, ② 어느
        시도에 소비가 몰리는지, ③ 어느 진료과목에 쓰는지를 국가별·지역별로 나란히 놓습니다.
        6개국 · 17개 시도 · <b>2020년 1월 ~ 2026년 7월</b> 월간 기준입니다.
      </p>

      <DataSources
        period="2020.01 ~ 2026.07"
        items={[
          {
            key: "medicalCountry",
            fields:
              "국가별 의료 소비액(천원)·소비건수, 전체 외국인 대비 비율(%), 진료과목별 구성비(%) — 전부 월별",
            use: "패널 1(국가별 추이)과 패널 3의 국가별 진료과목 구성",
          },
          {
            key: "medicalRegion",
            fields:
              "시도별·전국 의료 소비액(천원)·소비건수(월별)와 진료과목별 구성비(%, 연 단위)",
            use: "패널 2(지역별 지도·랭킹)와 패널 3의 지역별 진료과목 구성, 상단 “전체 외국인” 요약 카드",
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
          ⚠ 데이터 읽는 법 — 국가와 지역은 서로 교차되지 않습니다
        </b>
        「국가별 의료소비」는 <b>국가별이되 전국 합계</b>(지역 구분 없음), 「지역별 의료소비」는{" "}
        <b>지역별이되 전체 외국인</b>(국가 구분 없음)입니다. 그래서 &ldquo;일본인이 부산에서 쓴
        의료비&rdquo;는 두 자료 어느 쪽으로도 구할 수 없습니다 — 패널 1은 국가축, 패널 2는 지역축으로
        따로 읽어야 합니다. 다만 두 자료는 <b>지표·단위가 같습니다</b>: 「국가별 의료소비」의
        &ldquo;전체 외국인 대비 비율&rdquo;로 역산한 총액이 「지역별 의료소비」의 &ldquo;전국&rdquo;
        값과 일치합니다. 그래서 국가 점유율과 지역 분포를 같은 파이의 두 단면으로 읽어도 됩니다.
        <br />
        소비액·소비건수는 국가·지역 모두 <b>월별</b>입니다. 다만 <b>진료과목 구성비(패널 3)만 시간
        단위가 다릅니다</b> — 데이터랩이 지역 쪽 진료과목은 월별로 주지 않아, 지역 막대는{" "}
        <b>그 해 전체를 하나로 뭉갠 값</b>이라 위에서 고른 기준월을 따르지 않습니다(국가 막대는
        기준월을 따릅니다). 「지역별 의료소비」의 &ldquo;전국&rdquo;에는 시도가
        특정되지 않은 소비가 섞여 있어 17개 시도 합계보다 큽니다. 2026년은 7월까지 제공되고,
        2026.07 시도 개편(전남광주통합특별시 출범)으로 광주·전남은 2026년 6월까지만 집계됩니다.
      </div>

      <MedicalBoard data={data} />
    </div>
  );
}
