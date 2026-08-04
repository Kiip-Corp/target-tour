import {
  fetchAreaTarExpDs,
  type AreaTarExpDsItem,
  type AreaTarExpDsParams,
} from "@/lib/kto/areaTarExpDs";

const CASES: { label: string; params: AreaTarExpDsParams }[] = [
  {
    label: "서울 구로구 · 외지인 소비액",
    params: {
      baseYm: "202509",
      areaNm: "서울특별시",
      sigunguNm: "구로구",
      tarExpDsIxCd: "2201",
      numOfRows: 10,
    },
  },
  {
    label: "서울 강남구 · 외지인 소비액",
    params: {
      baseYm: "202509",
      areaNm: "서울특별시",
      sigunguNm: "강남구",
      tarExpDsIxCd: "2201",
      numOfRows: 10,
    },
  },
  {
    label: "부산 해운대구 · 전체 대비 외지인 소비액 비중",
    params: {
      baseYm: "202509",
      areaNm: "부산광역시",
      sigunguNm: "해운대구",
      tarExpDsIxCd: "2202",
      numOfRows: 10,
    },
  },
  {
    label: "제주시 · 관광소비강도(전체)",
    params: {
      baseYm: "202509",
      areaNm: "제주특별자치도",
      sigunguNm: "제주시",
      tarExpDsIxCd: "22",
      numOfRows: 10,
    },
  },
];

type Result = { items: AreaTarExpDsItem[] } | { error: string };

async function run(params: AreaTarExpDsParams): Promise<Result> {
  try {
    return { items: await fetchAreaTarExpDs(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function TestExpPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
        areaTarExpDsList 테스트 · {CASES.length}건 호출
      </h1>
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
