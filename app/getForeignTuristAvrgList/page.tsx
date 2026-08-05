import {
  fetchForeignTuristAvrgList,
  type ForeignTuristAvrgItem,
  type ForeignTuristAvrgParams,
} from "@/lib/EdrcntTourismStatsService/getForeignTuristAvrgList";

const CASES: { label: string; params: ForeignTuristAvrgParams }[] = [
  {
    label: "2012년 9월 · 전체",
    params: { YM: "201209", numOfRows: 10 },
  },
  {
    label: "2012년 9월 · 탄자니아(NAT_CD=583)",
    params: { YM: "201209", NAT_CD: "583", numOfRows: 10 },
  },
  {
    label: "2012년 9월 · 중국(NAT_CD=112)",
    params: { YM: "201209", NAT_CD: "112", numOfRows: 10 },
  },
  {
    label: "2012년 10월 · 전체",
    params: { YM: "201210", numOfRows: 10 },
  },
];

type Result = { items: ForeignTuristAvrgItem[] } | { error: string };

async function run(params: ForeignTuristAvrgParams): Promise<Result> {
  try {
    return { items: await fetchForeignTuristAvrgList(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function GetForeignTuristAvrgListPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        getForeignTuristAvrgList 테스트 · {CASES.length}건 호출
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        방한외래관광객평균체재일조회 — 월별·국적 조건별 방한외래관광객 평균체재일수. 이 서비스는
        AreaTarDemDsService/AreaTarDivService와 별도 활용신청이 필요해, 승인 전에는 아래 카드에
        SERVICE KEY IS NOT REGISTERED 에러가 표시됩니다.
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
