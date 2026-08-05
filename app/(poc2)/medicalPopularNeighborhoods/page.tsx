import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import PopularNeighborhoodClient, { type RegionSeries } from "./PopularNeighborhoodClient";

const ANNUAL_ROOT = path.join(process.cwd(), "data", "5_연간2018-2026");
const MONTHLY_ROOT = path.join(process.cwd(), "data", "5_월간2025");
// 전국 폴더의 "인기 소비 동네" 파일은 시군구/행정동이 아니라 시도 단위 월간 랭킹이라
// (컬럼 구조 자체가 다름) 이 페이지의 "지역 → 동네 5곳" 모델에서 제외한다.
const FOLDERS = [
  "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "울산광역시",
  "대전광역시", "세종특별자치시", "경기도", "충청북도", "충청남도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도", "강원특별자치도", "전북특별자치도",
] as const;
const SHORT: Record<string, string> = {
  서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 울산광역시: "울산", 대전광역시: "대전", 세종특별자치시: "세종",
  경기도: "경기", 충청북도: "충북", 충청남도: "충남", 전라남도: "전남", 경상북도: "경북",
  경상남도: "경남", 제주특별자치도: "제주", 강원특별자치도: "강원", 전북특별자치도: "전북",
};

// dataviz 스킬 검증 팔레트 — 지역 전환 시 해당 지역 동네만 화면에 남으므로(다른 지역과 동시 노출 없음)
// 매 지역마다 슬롯 1~5를 순서대로 재사용해도 안전하다.
const SLOT_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4"];

async function findDir(root: string, nameFull: string) {
  const entries = await readdir(root);
  const target = nameFull.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC").includes(target));
  if (!match) throw new Error(`${root}에서 "${nameFull}" 폴더를 찾지 못했습니다.`);
  return path.join(root, match);
}

async function findCsv(dir: string, suffix: string) {
  const entries = await readdir(dir);
  const target = suffix.normalize("NFC");
  const match = entries.find((f) => f.normalize("NFC").endsWith(target));
  if (!match) throw new Error(`${dir}에서 "${suffix}"로 끝나는 파일을 찾지 못했습니다.`);
  return path.join(dir, match);
}

async function loadNeighborhoods(dir: string, suffix: string) {
  const file = await findCsv(dir, suffix);
  const raw = await readFile(file, "utf-8");
  const rows = raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [period, , gu, dong, value] = line.split(",");
      return { period: Number(period), place: `${gu.trim()} ${dong.trim()}`, value: Number(value) };
    });

  const periods = [...new Set(rows.map((r) => r.period))].sort((a, b) => a - b);
  const places = [...new Set(rows.map((r) => r.place))];

  const series = places.map((place, i) => ({
    label: place,
    color: SLOT_COLORS[i % SLOT_COLORS.length],
    points: periods.map((year) => ({
      year,
      value: rows.find((r) => r.period === year && r.place === place)?.value ?? 0,
    })),
  }));

  return { series, years: periods };
}

async function loadRegions(root: string): Promise<RegionSeries[]> {
  return Promise.all(
    FOLDERS.map(async (full) => {
      const dir = await findDir(root, full);
      const [count, amount] = await Promise.all([
        loadNeighborhoods(dir, "의료소비건수 진료과목별 인기 소비 동네.csv"),
        loadNeighborhoods(dir, "의료소비액 진료과목별 인기 소비 동네.csv"),
      ]);
      return { region: SHORT[full], count, amount };
    })
  );
}

export default async function MedicalPopularNeighborhoodsPage() {
  const [annual, monthly] = await Promise.all([
    loadRegions(ANNUAL_ROOT),
    loadRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>지역별 의료소비 - 인기 소비동네</h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/5_연간2018-2026, data/5_월간2025 · 시도 버튼을 누르면 해당 지역 상위 동네(최대
        5곳)의 소비 비율 추이가 멀티라인으로 렌더링됩니다. 연간(2018–2026)/월간(2025) 토글로
        기간 단위를 바꿀 수 있습니다. 전국 폴더의 동일 파일은 시군구/행정동이 아닌 시도 단위
        랭킹이라(컬럼 구조가 다름) 이 목록에서는 제외했습니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <PopularNeighborhoodClient annual={annual} monthly={monthly} />
      </div>
    </div>
  );
}
