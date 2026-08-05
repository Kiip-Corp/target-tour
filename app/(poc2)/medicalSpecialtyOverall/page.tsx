import { readFile } from "node:fs/promises";
import path from "node:path";
import StackedShareChart, { type ShareRow } from "../StackedShareChart";

async function loadSnapshot(label: string, ...segments: string[]): Promise<ShareRow[]> {
  const file = path.join(process.cwd(), "data", ...segments);
  const raw = await readFile(file, "utf-8");
  const shares = Object.fromEntries(
    raw
      .replace(/^﻿/, "") // BOM 제거
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [category, value] = line.split(",");
        return [category.trim(), Number(value)];
      })
  );
  return [{ period: label, shares }];
}

export default async function MedicalSpecialtyOverallPage() {
  const [amountAll, amountRecent, countAll, countRecent] = await Promise.all([
    loadSnapshot("전체기간", "3_연간2018-2026", "3-3외국인 의료 소비액 진료과목별 비율.csv"),
    loadSnapshot("2025년", "3_월간2025", "3-3_외국인 의료 소비액 진료과목별 비율.csv"),
    loadSnapshot("전체기간", "3_연간2018-2026", "3-6외국인 의료 소비건수 진료과목별 비율.csv"),
    loadSnapshot("2025년", "3_월간2025", "3-6_외국인 의료 소비건수 진료과목별 비율.csv"),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        진료과목별 외국인 의료 소비 비율 (종합)
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        3-3(소비액 진료과목별 비율) · 3-6(소비건수 진료과목별 비율) · 연도별 추이가 아니라
        구간(전체기간 누적 2018–2026 / 최근 2025년) 단위 스냅샷이라 막대가 한 개씩만 표시됩니다.
        연도별 흐름은 medicalSpecialtyMix 페이지를 참고하세요.
      </p>
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 28 }}>
        <StackedShareChart
          amountAnnual={amountAll}
          amountMonthly={amountRecent}
          countAnnual={countAll}
          countMonthly={countRecent}
          periodToggleLabels={["전체기간 누적 (2018–2026)", "최근 1년 (2025)"]}
        />
      </div>
    </div>
  );
}
