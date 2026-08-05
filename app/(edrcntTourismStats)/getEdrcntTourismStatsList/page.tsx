import {
  fetchEdrcntTourismStatsList,
  type EdrcntTourismStatsItem,
  type EdrcntTourismStatsParams,
} from "@/lib/EdrcntTourismStatsService/getEdrcntTourismStatsList";

const CASES: { label: string; params: EdrcntTourismStatsParams }[] = [
  {
    label: "2012년 1월 · 전체",
    params: { YM: "201201", numOfRows: 10 },
  },
  {
    label: "2012년 1월 · 중국(NAT_CD=112) · 방한외래관광객",
    params: { YM: "201201", NAT_CD: "112", ED_CD: "E", numOfRows: 10 },
  },
  {
    label: "2012년 1월 · 한국(NAT_CD=100) · 국민해외관광객",
    params: { YM: "201201", NAT_CD: "100", ED_CD: "D", numOfRows: 10 },
  },
  {
    label: "2012년 6월 · 방한외래관광객(ED_CD=E)",
    params: { YM: "201206", ED_CD: "E", numOfRows: 10 },
  },
];

type Result = { items: EdrcntTourismStatsItem[] } | { error: string };

async function run(params: EdrcntTourismStatsParams): Promise<Result> {
  try {
    return { items: await fetchEdrcntTourismStatsList(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function GetEdrcntTourismStatsListPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        getEdrcntTourismStatsList 테스트 · {CASES.length}건 호출
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        출입국관광통계조회 — 기간·국가·출/입국구분(ED_CD: D=국민해외관광객, E=방한외래관광객) 조건별
        관광 출입국자수. 이 서비스는 AreaTarDemDsService/AreaTarDivService와 별도 활용신청이
        필요해, 승인 전에는 아래 카드에 SERVICE KEY IS NOT REGISTERED 에러가 표시됩니다.
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
