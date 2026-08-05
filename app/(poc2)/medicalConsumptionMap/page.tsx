import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import KoreaConsumptionMap, { type RegionData } from "./KoreaConsumptionMap";
import { REGIONS } from "./koreaGeo";

const ROOT = path.join(process.cwd(), "data", "5_연간2018-2026");

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

async function loadTrend(dir: string, suffix: string): Promise<Record<number, number>> {
  const file = await findCsv(dir, suffix);
  const raw = await readFile(file, "utf-8");
  const out: Record<number, number> = {};
  raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .forEach((line) => {
      const cols = line.split(",");
      out[Number(cols[0])] = Number(cols[cols.length - 1]);
    });
  return out;
}

export default async function MedicalConsumptionMapPage() {
  const nationDir = await findDir("전국");
  const [nationCount, nationAmount] = await Promise.all([
    loadTrend(nationDir, "외국인 의료 소비건수 추이.csv"),
    loadTrend(nationDir, "외국인 의료 소비액 추이.csv"),
  ]);
  const years = Object.keys(nationCount).map(Number).sort((a, b) => a - b);
  const nationTotals: Record<number, { count: number; amount: number }> = Object.fromEntries(
    years.map((y) => [y, { count: nationCount[y] ?? 0, amount: nationAmount[y] ?? 0 }])
  );

  const regions: RegionData[] = await Promise.all(
    REGIONS.map(async ({ full, short, lat, lng }) => {
      const dir = await findDir(full);
      const [count, amount] = await Promise.all([
        loadTrend(dir, "외국인 의료 소비건수 추이.csv"),
        loadTrend(dir, "외국인 의료 소비액 추이.csv"),
      ]);
      const byYear = Object.fromEntries(
        years.map((y) => [y, { count: count[y] ?? 0, amount: amount[y] ?? 0 }])
      );
      return { short, full, lat, lng, byYear };
    })
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: "ui-monospace, monospace" }}>
        지역별 외국인 의료 소비 지도
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6, fontFamily: "ui-monospace, monospace" }}>
        data/5_연간2018-2026/&lt;시도&gt;/…추이.csv · 연도·지표(소비건수/소비액)를 바꿔가며 17개 시도의
        규모를 원 크기·색으로 한반도 지도 위에 표시합니다. /visitor 페이지와 같은 좌표 데이터를
        재사용했습니다.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <KoreaConsumptionMap regions={regions} years={years} nationTotals={nationTotals} />
      </div>
    </div>
  );
}
