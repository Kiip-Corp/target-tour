import { readFile } from "node:fs/promises";
import path from "node:path";
import MultiLineChart, { type NamedSeries } from "../../_components/MultiLineChart";
import InsightBox from "../InsightBox";

// dataviz 스킬 검증 팔레트(라이트) — 2-1(국가) 차트와 동일한 10슬롯 재사용, 고정 순서
const REGION_ORDER: { region: string; color: string }[] = [
  { region: "서울", color: "#2a78d6" },
  { region: "경기", color: "#eb6834" },
  { region: "부산", color: "#1baf7a" },
  { region: "제주", color: "#eda100" },
  { region: "인천", color: "#e87ba4" },
  { region: "대구", color: "#008300" },
  { region: "대전", color: "#4a3aa7" },
  { region: "충남", color: "#e34948" },
  { region: "전북", color: "#0d9488" },
  { region: "경북", color: "#a3a300" },
];
// Grid.csv에는 15개 지역이 있다. 위 10개(기본 5 + 상위 추가 5) 밖의 나머지 5개
// (모두 연 3,900명 미만, 서울 대비 미미)는 개별 색상 대신 "기타"로 합산한다 —
// dataviz 스킬: 카테고리 색상은 검증된 슬롯 수를 넘기지 않고, 넘치는 항목은
// Other/합산으로 접는다.
const OTHER_REGIONS = ["광주", "충북", "경남", "강원", "울산"];
const OTHER_COLOR = "#898781"; // 중립 회색 — 실제 국가/지역이 아닌 잔여 합계 표시

const DEFAULT_VISIBLE = ["서울", "경기", "부산", "제주", "인천"];
const EXCLUDE = new Set(["합계"]);

async function loadData() {
  const file = path.join(process.cwd(), "data", "2-2지역별 외국인 환자 현황_Grid.csv");
  const raw = await readFile(file, "utf-8");
  const rows = raw
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [year, region, value] = line.split(",");
      return { year: Number(year), region: region.trim(), value: Number(value) };
    })
    .filter((r) => !EXCLUDE.has(r.region));

  const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);

  const named: NamedSeries[] = REGION_ORDER.map(({ region, color }) => ({
    label: region,
    color,
    points: years.map((year) => ({
      year,
      value: rows.find((r) => r.year === year && r.region === region)?.value ?? 0,
    })),
  }));

  const other: NamedSeries = {
    label: "기타",
    color: OTHER_COLOR,
    points: years.map((year) => ({
      year,
      value: rows
        .filter((r) => r.year === year && OTHER_REGIONS.includes(r.region))
        .reduce((sum, r) => sum + r.value, 0),
    })),
  };

  return { series: [...named, other], years };
}

export default async function ForeignPatientsByRegionPage() {
  const { series, years } = await loadData();

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>지역별 외국인 환자 현황 추이</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        2-2지역별 외국인 환자 현황_Grid.csv · 기본 5개 지역(서울·경기·부산·제주·인천) 표시, 나머지
        지역은 위 버튼으로 켜고 끌 수 있습니다. 규모가 작은 5개 지역({OTHER_REGIONS.join("·")})은
        &ldquo;기타&rdquo;로 합산해 보여줍니다.
      </p>
      <InsightBox
        items={[
          "서울 쏠림이 갈수록 심해지고 있습니다 — 전국 대비 서울 비중이 2018년 64.8%에서 2024년 85.4%로 커졌고, 서울만 6년간 4.1배(245,463→999,642명) 성장했습니다.",
          "2023→2024 1년 사이에도 서울(2.1배), 부산(2.3배), 제주(3.2배)가 모두 큰 폭으로 늘어 특정 해에 국한된 변화가 아니라 최근 지속되는 성장 흐름으로 보입니다.",
          "경기·인천을 제외한 나머지 지역은 규모 자체가 작아(연 4천 명 미만) &ldquo;기타&rdquo;로 묶었는데, 이 지역들의 합계도 서울 성장 속도에는 못 미쳐 격차가 벌어지는 추세입니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <MultiLineChart
          series={series}
          years={years}
          defaultVisible={DEFAULT_VISIBLE}
          groupLabel="지역"
        />
      </div>
    </div>
  );
}
