import {
  fetchOvseaTuristStatsList,
  type OvseaTuristStatsItem,
  type OvseaTuristStatsParams,
} from "@/lib/EdrcntTourismStatsService/getOvseaTuristStatsList";

const CASES: { label: string; params: OvseaTuristStatsParams }[] = [
  {
    label: "2012년 1월 · 전체",
    params: { YM: "201201", numOfRows: 10 },
  },
  {
    label: "2012년 1월 · 여성(SEX_CD=F)",
    params: { YM: "201201", SEX_CD: "F", numOfRows: 10 },
  },
  {
    label: "2012년 1월 · 11-20세(AGE_CD=20)",
    params: { YM: "201201", AGE_CD: "20", numOfRows: 10 },
  },
  {
    label: "2012년 1월 · 부산 출국(PORT_CD=PS)",
    params: { YM: "201201", PORT_CD: "PS", numOfRows: 10 },
  },
];

type Result = { items: OvseaTuristStatsItem[] } | { error: string };

async function run(params: OvseaTuristStatsParams): Promise<Result> {
  try {
    return { items: await fetchOvseaTuristStatsList(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function GetOvseaTuristStatsListPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        getOvseaTuristStatsList 테스트 · {CASES.length}건 호출
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        국민해외관광객통계조회 — 월별·성별·연령대·출국항 조건별 국민해외관광객수. 이 서비스는
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
