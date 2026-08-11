import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import KoreaConsumptionMap, { type RegionData } from "./KoreaConsumptionMap";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";
import InsightBox from "../InsightBox";

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
    SIDO_CODES.map(async ({ full, short, code }) => {
      const dir = await findDir(full);
      const [count, amount] = await Promise.all([
        loadTrend(dir, "외국인 의료 소비건수 추이.csv"),
        loadTrend(dir, "외국인 의료 소비액 추이.csv"),
      ]);
      const byYear = Object.fromEntries(
        years.map((y) => [y, { count: count[y] ?? 0, amount: amount[y] ?? 0 }])
      );
      return { short, full, code, byYear };
    })
  );

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, fontFamily: "ui-monospace, monospace" }}>
        지역별 외국인 의료 소비 지도
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6, fontFamily: "ui-monospace, monospace" }}>
        data/5_연간2018-2026/&lt;시도&gt;/…추이.csv · 연도·지표(소비건수/소비액)를 바꿔가며 17개 시도의
        규모를 지역 색상으로 표시합니다. tourismConsumptionMapDrilldown과 같은 실측 경계 지도
        (app/_koreaBubbleMap)를 씁니다 — 휠로 확대·드래그로 이동할 수 있고, 이 데이터셋은 시도
        단위까지만 있어 서울 구단위 드릴다운은 꺼져 있습니다.
      </p>
      <InsightBox
        items={[
          "서울의 쏠림이 시간이 갈수록 심해집니다 — 전국 소비건수 중 서울 비중이 2018년 54.3%에서 2025년 67.5%로 커졌고, 경기(7.9%)·부산(6.3%)이 멀찍이 2·3위입니다.",
          "일부 지역 쌍(대구–인천, 충남–전남, 제주–강원)의 수치가 연도별로 완전히 동일하게 나타납니다 — 실제 지역 차이라기보다 원본 데이터의 중복/placeholder로 보여, 이 지역들 간 세부 비교는 주의가 필요합니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <KoreaConsumptionMap regions={regions} years={years} nationTotals={nationTotals} />
      </div>
    </div>
  );
}
