import {
  fetchTourismBalcList,
  type TourismBalcItem,
  type TourismBalcParams,
} from "@/lib/EdrcntTourismStatsService/getTourismBalcList";

const CASES: { label: string; params: TourismBalcParams }[] = [
  { label: "2012년 1월", params: { YM: "201201", numOfRows: 10 } },
  { label: "2012년 9월", params: { YM: "201209", numOfRows: 10 } },
  { label: "2020년 1월", params: { YM: "202001", numOfRows: 10 } },
  { label: "2024년 12월", params: { YM: "202412", numOfRows: 10 } },
];

type Result = { items: TourismBalcItem[] } | { error: string };

async function run(params: TourismBalcParams): Promise<Result> {
  try {
    return { items: await fetchTourismBalcList(params) };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function GetTourismBalcListPage() {
  const results = await Promise.all(CASES.map((c) => run(c.params)));

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        getTourismBalcList 테스트 · {CASES.length}건 호출
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        관광수지조회 — 월별 관광 수입·지출과 1인당 평균 소비액. 이 서비스는
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
