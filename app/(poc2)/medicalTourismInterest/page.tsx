import { readFile } from "node:fs/promises";
import path from "node:path";
import LineChart from "./LineChart";

async function loadData() {
  const file = path.join(process.cwd(), "data", "1-의료관광 관심도 추이.csv");
  const raw = await readFile(file, "utf-8");
  return raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [ym, value] = line.split(",");
      return { ym: ym.trim(), value: Number(value) };
    });
}

export default async function MedicalTourismInterestPage() {
  const data = await loadData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>의료관광 관심도 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        1-의료관광 관심도 추이.csv · 구글 트렌드 기반 한국 의료관광 관심도 지수(0–100) · d3로 그린
        꺾은선 그래프
      </p>
      <div
        style={{
          background: "#F4F8F6",
          border: "1px solid #D6E7E1",
          borderRadius: 10,
          padding: "14px 18px",
          marginBottom: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: "#0E7C6B", letterSpacing: "0.04em", marginBottom: 8 }}>
          시사점
        </div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.7, color: "#25303B" }}>
          <li>
            2024.08–2025.12은 13~40 사이를 등락하며 뚜렷한 추세 없이 낮은 수준(평균 약 23)에
            머물렀습니다.
          </li>
          <li>
            2026년 들어 뚜렷하게 반등해 1월 58 → 4월 100(전체 기간 최고치)까지 올랐고, 5~6월에도
            60대 이상을 유지했습니다 — 직전 구간 대비 약 2.7배 높은 수준입니다.
          </li>
          <li>
            가장 최근 달(2026.07)은 0으로 표시되지만, 이 지수는 상대적 비율이라 신규 월이
            반영될 때마다 과거 값도 재산정되는 방식입니다(readme 유의사항) — 급락으로 단정하기보다
            다음 달 재계산치로 재확인이 필요합니다.
          </li>
        </ul>
      </div>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <LineChart data={data} />
      </div>
    </div>
  );
}
