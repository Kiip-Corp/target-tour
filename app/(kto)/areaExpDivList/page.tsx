import {
  fetchAreaExpDivList,
  type AreaExpDivListItem,
  type AreaExpDivListParams,
} from "@/lib/kto/areaExpDivList";

const CASES: { label: string; params: AreaExpDivListParams }[] = [
  {
    label: "서울 구로구 · 40대 소비액",
    params: {
      baseYm: "202509",
      areaNm: "서울특별시",
      sigunguNm: "구로구",
      expDivIxCd: "3204",
      numOfRows: 10,
    },
  },
  {
    label: "서울 강남구 · 30대 소비액",
    params: {
      baseYm: "202509",
      areaNm: "서울특별시",
      sigunguNm: "강남구",
      expDivIxCd: "3203",
      numOfRows: 10,
    },
  },
  {
    label: "부산 해운대구 · 20대 소비액",
    params: {
      baseYm: "202509",
      areaNm: "부산광역시",
      sigunguNm: "해운대구",
      expDivIxCd: "3202",
      numOfRows: 10,
    },
  },
  {
    label: "제주시 · 관광 소비 다양성(전체)",
    params: {
      baseYm: "202509",
      areaNm: "제주특별자치도",
      sigunguNm: "제주시",
      expDivIxCd: "32",
      numOfRows: 10,
    },
  },
];

type Result = { items: AreaExpDivListItem[] } | { error: string };

async function run(params: AreaExpDivListParams): Promise<Result> {
  try {
    return { items: await fetchAreaExpDivList(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function AreaExpDivListPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        areaExpDivList 테스트 · {CASES.length}건 호출
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        expDivIxCd — 관광 소비 다양성 지표 코드: 32: 전체, 3201: 10대 소비액, 3202: 20대 소비액,
        3203: 30대 소비액, 3204: 40대 소비액, 3205: 50대 소비액, 3206: 60대 소비액, 3207: 70대
        소비액
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 16,
        }}
      >
        {CASES.map((c, i) => {
          const r = results[i];
          return (
            <div key={c.label} style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 14 }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>{c.label}</div>
              {"error" in r ? (
                <pre style={{ color: "#B4413A", margin: 0, whiteSpace: "pre-wrap" }}>{r.error}</pre>
              ) : (
                <pre
                  style={{
                    background: "#F3F2EC",
                    padding: 12,
                    borderRadius: 8,
                    overflowX: "auto",
                    margin: 0,
                  }}
                >
                  {JSON.stringify(r.items, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
