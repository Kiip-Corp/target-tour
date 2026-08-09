import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import CountryRegionMap, { type CountryData } from "./CountryRegionMap";
import { SIDO_CODES } from "../koreaBubbleMap/sidoCodes";
import InsightBox from "../InsightBox";

const DATA_ROOT = path.join(process.cwd(), "data");

// 대만은 "관광소비 추이/현황" 파일들엔 "대만"으로, "히트맵" 파일엔 "타이완"으로 표기돼 있어
// (원본 데이터 표기 불일치) 국가별로 각 파일에서 실제 쓰인 키를 따로 지정한다.
const COUNTRIES = [
  { folder: "중국연간", label: "중국", heatmapKey: "중국" },
  { folder: "대만연간", label: "대만", heatmapKey: "타이완" },
  { folder: "일본연간", label: "일본", heatmapKey: "일본" },
  { folder: "미국연간", label: "미국", heatmapKey: "미국" },
  { folder: "태국연간", label: "태국", heatmapKey: "태국" },
  { folder: "홍콩연간", label: "홍콩", heatmapKey: "홍콩" },
];

async function findDir(nameSuffix: string) {
  const entries = await readdir(DATA_ROOT);
  const target = nameSuffix.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC") === `7${target}`);
  if (!match) throw new Error(`${DATA_ROOT}에서 "7${nameSuffix}" 폴더를 찾지 못했습니다.`);
  return path.join(DATA_ROOT, match);
}

async function findCsv(dir: string, suffix: string) {
  const entries = await readdir(dir);
  const target = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(target));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function loadRegionRatios(dir: string, suffix: string, key: string): Promise<Map<string, number>> {
  const file = await findCsv(dir, suffix);
  const raw = await readFile(file, "utf-8");
  const rows = raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
  const out = new Map<string, number>();
  for (const cols of rows) {
    if (cols[0].trim() !== key) continue;
    out.set(cols[1].trim(), Number(cols[2]));
  }
  return out;
}

export default async function ForeignVisitorRegionMapBubblePage() {
  const data: CountryData[] = await Promise.all(
    COUNTRIES.map(async ({ folder, label, heatmapKey }) => {
      const dir = await findDir(folder);
      const [visitMap, spendMap] = await Promise.all([
        loadRegionRatios(dir, "방문현황 히트맵.csv", heatmapKey),
        loadRegionRatios(dir, "관광소비 현황.csv", label),
      ]);
      const rows = SIDO_CODES.map((r) => ({
        region: r.full,
        short: r.short,
        code: r.code,
        visit: visitMap.get(r.full) ?? 0,
        spend: spendMap.get(r.full) ?? 0,
      }));
      return { country: label, rows };
    })
  );

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        국가별 방한 관광객 지역 분포 지도 (컬러 지도)
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/7&lt;국가&gt;연간 · 전국 방문현황 히트맵.csv, 전국 관광소비 현황.csv · 국가(중국·대만·
        일본·미국·태국·홍콩)와 지표(방문자 비율/관광소비 비율)를 바꿔가며 17개 시도의 분포를 지도
        위 지역 색상으로 표시합니다. (@tenqube/react-korea-bubble-map을 이 프로젝트의 React 19에
        맞게 직접 포팅한 ../koreaBubbleMap/KoreaBubbleMap — 원본은 D3로 DOM을 직접 그리는
        useEffect에 cleanup이 없어 Next.js 기본 Strict Mode의 개발 모드 이중 마운트에서 중복
        렌더링이 발생했습니다. 원본이 내장한 시도 단위 지리 데이터만 재사용하고 렌더링은 React가
        선언적으로 그리도록 새로 구현해, 지역 채우기 색을 지정하는 것도 정식 prop으로 지원합니다.
        서울 위에서 휠로 확대하면 서울 25개 구단위 지도로 드릴다운됩니다 — 다만 이 7번 데이터셋은
        시도 단위까지만 있어 구별 방문·소비 비율 데이터는 없고, 구 경계·이름만 확인할 수 있습니다.)
      </p>
      <InsightBox
        items={[
          "중국 관광객은 제주 방문 비율(17.5%, 서울 다음 2위)은 높지만 제주에서의 소비 비율은 6.7%에 그쳐, '많이 가지만 적게 쓰는' 지역입니다. 반대로 서울은 방문 24.8% 대비 소비 74.1%로 훨씬 많이 씁니다.",
          "대만 관광객만 유독 부산 비중이 뚜렷합니다 — 방문(17.4%)·소비(18.1%) 모두 서울 다음 확실한 2위인데, 다른 5개국은 부산이 상위권에 들지 못합니다.",
          "일본·태국·홍콩은 서울 소비 비중이 65~81%로 매우 높아 수도권 쏠림이 강한 반면, 미국은 서울 소비 비중이 59.7%로 6개국 중 가장 낮고 경기(18.0%)로 비교적 고르게 분산됩니다.",
          "미국 관광객만 유일하게 경상남도가 방문 상위 4위(11.1%)에 듭니다 — 다른 5개국에는 없는 패턴입니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <CountryRegionMap data={data} />
      </div>
    </div>
  );
}
