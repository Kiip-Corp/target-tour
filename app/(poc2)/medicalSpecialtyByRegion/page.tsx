import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import RegionSpecialtyClient from "./RegionSpecialtyClient";

const ROOT = path.join(process.cwd(), "data", "5_연간2018-2026");
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

async function findDir(nameFull: string) {
  const entries = await readdir(ROOT);
  const target = nameFull.normalize("NFC");
  const match = entries.find((e) => e.normalize("NFC").includes(target));
  if (!match) throw new Error(`${ROOT}에서 "${nameFull}" 폴더를 찾지 못했습니다.`);
  return path.join(ROOT, match);
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

export default async function MedicalSpecialtyByRegionPage() {
  const data = await Promise.all(
    FOLDERS.map(async (full) => {
      const dir = await findDir(full);
      const [count, amount] = await Promise.all([
        loadShare(dir, "외국인 의료 소비건수 진료과목별 비율.csv"),
        loadShare(dir, "외국인 의료 소비액 진료과목별 비율.csv"),
      ]);
      return { region: SHORT[full], count, amount };
    })
  );

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        지역별 진료과목 소비 비율
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/5_연간2018-2026/&lt;시도&gt;/…진료과목별 비율.csv · 시도 버튼을 누르면 해당 지역의
        진료과목 구성비(소비건수·소비액)가 100% 누적 막대로 렌더링됩니다. 연도 구분 없는
        전체기간 스냅샷입니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <RegionSpecialtyClient data={data} />
      </div>
    </div>
  );
}
