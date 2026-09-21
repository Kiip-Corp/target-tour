import BoardTabs from "../_marketingBoard/BoardTabs";
import DataSources from "../_marketingBoard/DataSources";
import ContentStudio from "./ContentStudio";
import { loadContentFacts } from "./targetFacts";

const MUTED = "#6B7280";

export default async function ContentPage() {
  const facts = await loadContentFacts();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/content" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        콘텐츠 생성 — 그래서 누구에게 · 무슨 말을
      </h1>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>
        앞의 세 탭이 고른 <b>시도 × 국적</b>을 그대로 받아, 그 타깃의 실측 근거를 붙여 채널별 홍보
        카피를 만듭니다. ① 방문지와 국적을 고르면 방문 규모·소비의 질·의료소비가 근거로 따라붙고{" "}
        <b>전년 대비 비중이 오른 진료과목</b>이 카피의 후크가 됩니다. ② 채널을 고르면 그 채널
        관행과 독자의 현지어로 카피가 나옵니다. 6개국 · 17개 시도 ·{" "}
        <b>2020년 1월 ~ 2026년 7월</b> 월간 기준입니다.
      </p>

      <DataSources
        period="2020.01 ~ 2026.07"
        items={[
          {
            key: "tour",
            fields:
              "시도별 “전체 외국인” 방문자 수(명)·관광소비액(천원)과, 그중 각 국가가 차지하는 비율(%)",
            use: "타깃 카드의 추정 방문자 수·방문당 관광소비·전년비·방문 성수기",
          },
          {
            key: "medicalCountry",
            fields: "국가별 의료 소비액(천원)·전체 외국인 대비 비율(%)과 진료과목별 구성비(%)",
            use: "그 국적의 전국 의료소비 규모와 소구 과목(카피의 소구 근거)",
          },
          {
            key: "medicalRegion",
            fields: "시도별 의료 소비액(천원)과 진료과목별 구성비(%)",
            use: "선택한 시도에서 어느 과목에 소비가 몰리는지 — 지역 쪽 소구 근거",
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
          ⚠ 읽는 법 — 방문·관광소비는 추정치, 의료소비는 원자료입니다
        </b>
        <b>① 방문자 수와 관광소비액의 국가별 값은 계산값입니다.</b> 데이터랩은 시도 × 월로{" "}
        <b>&ldquo;전체 외국인&rdquo; 절대값</b>과 그중 <b>해당 국가 비율(%)</b>을 따로 줍니다. 이
        둘을 곱해 만든 추정치라 ① 탭과 성격이 같습니다(연 단위로 합산하면 데이터랩의 연간
        지역분포 비율과 소수점 첫째 자리까지 일치합니다). 반면 의료소비는 원자료 그대로입니다.
        <br />
        <b>② 의료소비의 국가 축과 지역 축은 서로 다른 자료입니다.</b> 국가별 의료소비는{" "}
        <b>전국</b> 합계(지역 구분이 없습니다), 지역별 의료소비는 <b>전체 외국인</b> 합계(국적
        구분이 없습니다)입니다. 그래서 &ldquo;중국인이 부산에서 쓴 의료비&rdquo;는 이 자료로
        구할 수 없고, 두 축을 곱하지 마세요 — 카피의 근거로도 각각 따로 넘깁니다.
        <br />
        <b>③ 진료과목은 절대액이 아니라 구성비(%)입니다.</b> 합이 100%라 지역끼리 크기를 견주는
        숫자가 아닙니다. 대신 <b>전년 대비 비중이 오른 과목</b>은 그 해에 돈이 그쪽으로
        옮겨갔다는 뜻이라, 이걸 카피의 후크로 씁니다.
        <br />
        <b>④ 생성 카피는 검수 전 초안입니다.</b> 의료광고는 사전심의 대상이라 그대로 집행할 수
        없습니다. 모델에 과장된 효과 표현을 금지하고 수치를 카피에 직접 인용하지 말라고
        지시하지만, 현지어 표현·의료법 저촉 여부는 사람이 봐야 합니다 — 각 카드 아래{" "}
        <b>&ldquo;내부 검토&rdquo;</b> 한 줄이 그 용도입니다.
      </div>

      <ContentStudio facts={facts} />
    </div>
  );
}
