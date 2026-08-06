import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import RegionSpecialtyClient, { type RegionShare } from "./RegionSpecialtyClient";
import InsightBox from "../InsightBox";

const ANNUAL_ROOT = path.join(process.cwd(), "data", "5_연간2018-2026");
const MONTHLY_ROOT = path.join(process.cwd(), "data", "5_월간2025");
const FOLDERS = [
  "전국", "서울특별시", "부산광역시", "대구광역시", "인천광역시", "광주광역시", "울산광역시",
  "대전광역시", "세종특별자치시", "경기도", "충청북도", "충청남도", "전라남도", "경상북도",
  "경상남도", "제주특별자치도", "강원특별자치도", "전북특별자치도",
] as const;
const SHORT: Record<string, string> = {
  전국: "전국", 서울특별시: "서울", 부산광역시: "부산", 대구광역시: "대구", 인천광역시: "인천",
  광주광역시: "광주", 울산광역시: "울산", 대전광역시: "대전", 세종특별자치시: "세종",
  경기도: "경기", 충청북도: "충북", 충청남도: "충남", 전라남도: "전남", 경상북도: "경북",
  경상남도: "경남", 제주특별자치도: "제주", 강원특별자치도: "강원", 전북특별자치도: "전북",
};

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

async function loadShare(dir: string, suffix: string): Promise<Record<string, number>> {
  const file = await findCsv(dir, suffix);
  const raw = await readFile(file, "utf-8");
  return Object.fromEntries(
    raw
      .replace(/^﻿/, "")
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [category, value] = line.split(",");
        return [category.trim(), Number(value)];
      })
  );
}

async function loadRegions(root: string): Promise<RegionShare[]> {
  return Promise.all(
    FOLDERS.map(async (full) => {
      const dir = await findDir(root, full);
      const [count, amount] = await Promise.all([
        loadShare(dir, "외국인 의료 소비건수 진료과목별 비율.csv"),
        loadShare(dir, "외국인 의료 소비액 진료과목별 비율.csv"),
      ]);
      return { region: SHORT[full], count, amount };
    })
  );
}

export default async function MedicalSpecialtyByRegionPage() {
  const [annual, monthly] = await Promise.all([
    loadRegions(ANNUAL_ROOT),
    loadRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        지역별 의료소비 - 진료과목별
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/5_연간2018-2026, data/5_월간2025 · 시도 버튼을 누르면 해당 지역의 진료과목
        구성비(소비건수·소비액)가 100% 누적 막대로 렌더링됩니다. 연간(2018–2026 전체기간
        누적)/월간(2025년 누적) 토글로 기간 범위를 바꿀 수 있습니다.
      </p>
      <InsightBox
        items={[
          "지역과 무관하게 반복되는 패턴이 있습니다 — 소비건수는 어느 지역이든 약국이 55~74%로 압도적 1위, 소비액은 피부과가 43~51%로 1위입니다. 방문은 약국에서 많이 하지만 돈은 피부과에 더 많이 씁니다.",
          "성형외과 비중은 지역차가 뚜렷합니다 — 서울은 소비액의 29.0%가 성형외과인데 부산은 8.3%에 그쳐 3.5배 차이가 납니다. 강남 등 서울 성형외과 클러스터의 존재가 데이터로도 드러납니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <RegionSpecialtyClient annual={annual} monthly={monthly} />
      </div>
    </div>
  );
}
