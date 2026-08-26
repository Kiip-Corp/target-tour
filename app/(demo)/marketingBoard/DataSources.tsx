const BORDER = "#E7E6E0";
const INK = "#171A21";
const MUTED = "#6B7280";
const SURFACE = "#FBFBF8";

const DATALAB = "https://datalab.visitkorea.or.kr";

export type SourceKey = "tour" | "medicalCountry" | "medicalRegion";

/**
 * 원자료의 고정 정보(이름·메뉴·축·주의)만 여기에 둔다. 어떤 값을 실제로 쓰는지는 보드마다
 * 다르므로 페이지가 `fields`로 넘긴다 — 그 보드에 없는 지표까지 설명하면 안 되기 때문이다.
 * 이름은 화면 문구·차트 범례와 같은 말을 쓰고, 팀 내부 자료 순번은 화면에 내보내지 않는다.
 */
const SOURCES: Record<
  SourceKey,
  { name: string; menu: string; href: string; axis: string; basis: string }
> = {
  tour: {
    name: "방문 · 관광소비",
    menu: "지역별 분석 › 지역별 방문자수/관광소비",
    href: `${DATALAB}/datalab/portal/loc/getAreaVisitDataForm.do`,
    axis: "국가 · 지역(17개 시도) · 월 — 셋 다 있음",
    basis: "국가별 절대값은 데이터랩이 주지 않아, 전체 외국인 값 × 국가 비율(%)로 계산합니다",
  },
  medicalCountry: {
    name: "국가별 의료소비",
    menu: "고부가 관광 › 의료관광 › 국가별 의료소비 추이",
    href: `${DATALAB}/datalab/portal/theme/getMedicalTourSearch.do`,
    axis: "국가 · 월 — 지역 구분 없음(항상 전국 합계)",
    basis: "신한카드 결제 기준이라, 카드로 결제되지 않은 진료비는 잡히지 않습니다",
  },
  medicalRegion: {
    name: "지역별 의료소비",
    menu: "고부가 관광 › 의료관광 › 지역별 의료소비 추이",
    href: `${DATALAB}/datalab/portal/theme/getMedicalTourSearch.do`,
    axis: "지역 · 월 — 국가 구분 없음(항상 전체 외국인 합계)",
    basis: "신한카드 결제 기준이라, 카드로 결제되지 않은 진료비는 잡히지 않습니다",
  },
};

/**
 * 보드 머리에 붙는 출처 카드. 이 보드가 실제로 읽는 컬럼(`fields`)과 그걸로 그리는 것(`use`)만
 * 적는다 — 다른 탭에서만 쓰는 지표는 그 탭의 카드에 적는다.
 */
export default function DataSources({
  items,
  period,
}: {
  items: { key: SourceKey; fields: string; use: string }[];
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
        {items.map(({ key, fields, use }) => {
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
              <div style={{ color: INK, fontWeight: 700, fontSize: 12 }}>{s.name}</div>
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
                  <span style={{ color: INK }}>이 보드가 쓰는 값</span> · {fields}
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

    </details>
  );
}
