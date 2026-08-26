const BORDER = "#E7E6E0";
const INK = "#171A21";
const MUTED = "#6B7280";
const SURFACE = "#FBFBF8";

const DATALAB = "https://datalab.visitkorea.or.kr";

export type SourceKey = "tour" | "medicalCountry" | "medicalRegion";

/**
 * 보드가 쓰는 원자료 3종. 이름은 화면 문구·차트 범례와 같은 말을 쓴다 —
 * 처음 보는 사람이 "4번"이 뭔지 몰라도 읽히게 하려는 것이라, 데이터랩 순번은 뒤에 괄호로만 남긴다.
 */
const SOURCES: Record<
  SourceKey,
  { name: string; menu: string; href: string; ref: string; gives: string; axis: string; basis: string }
> = {
  tour: {
    name: "방문 · 관광소비",
    menu: "지역별 분석 › 지역별 방문자수/관광소비",
    href: `${DATALAB}/datalab/portal/loc/getAreaVisitDataForm.do`,
    ref: "자료 7번",
    gives: "시도별 “전체 외국인” 방문자 수(명)와 관광소비액(천원), 그리고 그중 각 국가가 차지하는 비율(%)",
    axis: "국가 · 지역(17개 시도) · 월 — 셋 다 있음",
    basis: "국가별 절대값은 데이터랩이 주지 않아, 전체 외국인 값 × 국가 비율(%)로 계산합니다",
  },
  medicalCountry: {
    name: "국가별 의료소비",
    menu: "고부가 관광 › 의료관광 › 국가별 의료소비 추이",
    href: `${DATALAB}/datalab/portal/theme/getMedicalTourSearch.do`,
    ref: "자료 4번",
    gives:
      "국가별 의료 소비액(천원)·소비건수와 전체 외국인 대비 비율(%), 진료과목별 구성비(%)",
    axis: "국가 · 월 — 지역 구분 없음(항상 전국 합계)",
    basis: "신한카드 결제 기준이라, 카드로 결제되지 않은 진료비는 잡히지 않습니다",
  },
  medicalRegion: {
    name: "지역별 의료소비",
    menu: "고부가 관광 › 의료관광 › 지역별 의료소비 추이",
    href: `${DATALAB}/datalab/portal/theme/getMedicalTourSearch.do`,
    ref: "자료 5번",
    gives: "시도별·전국 의료 소비액(천원)·소비건수와 진료과목별 구성비(%)",
    axis: "지역 · 월 — 국가 구분 없음(항상 전체 외국인 합계)",
    basis: "신한카드 결제 기준이라, 카드로 결제되지 않은 진료비는 잡히지 않습니다",
  },
};

/**
 * 보드 머리에 붙는 출처 카드. `use`에는 "이 보드에서 이걸로 무엇을 그리는지"를 넣는다.
 */
export default function DataSources({
  items,
  period,
}: {
  items: { key: SourceKey; use: string }[];
  period: string;
}) {
  return (
    <details
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        background: SURFACE,
        padding: "10px 14px",
        marginBottom: 14,
        fontSize: 11.5,
        lineHeight: 1.7,
        color: MUTED,
      }}
    >
      <summary style={{ cursor: "pointer", color: INK, fontWeight: 700, fontSize: 11.5 }}>
        데이터 출처 — 전부 한국관광 데이터랩의 공개 자료 {period} · 자료 {items.length}종 (펼쳐 보기)
      </summary>

      <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
        {items.map(({ key, use }) => {
          const s = SOURCES[key];
          return (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(120px, 160px) 1fr",
                gap: 12,
                paddingTop: 10,
                borderTop: `1px solid ${BORDER}`,
              }}
            >
              <div>
                <div style={{ color: INK, fontWeight: 700, fontSize: 12 }}>{s.name}</div>
                <div style={{ fontSize: 10.5, opacity: 0.75 }}>{s.ref}</div>
              </div>
              <div>
                <div>
                  <span style={{ color: INK }}>데이터랩 메뉴</span> ·{" "}
                  <a
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#2a78d6", textDecoration: "none" }}
                  >
                    {s.menu} ↗
                  </a>
                </div>
                <div>
                  <span style={{ color: INK }}>들어 있는 값</span> · {s.gives}
                </div>
                <div>
                  <span style={{ color: INK }}>축</span> · {s.axis}
                </div>
                <div>
                  <span style={{ color: INK }}>이 보드에서</span> · {use}
                </div>
                <div style={{ opacity: 0.85 }}>※ {s.basis}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 10.5, opacity: 0.8 }}>
        「자료 N번」은 팀 내부 자료 목록(<code>data/readme.md</code>)의 순번입니다 — 아래 설명에서는
        번호 대신 위의 이름으로 부릅니다.
      </div>
    </details>
  );
}
