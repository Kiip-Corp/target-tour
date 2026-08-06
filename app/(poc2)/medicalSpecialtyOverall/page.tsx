import { readFile } from "node:fs/promises";
import path from "node:path";
import StackedShareChart, { type ShareRow } from "../StackedShareChart";
import InsightBox from "../InsightBox";

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
      <InsightBox
        items={[
          "최근 1년(2025) 수치가 전체기간 누적 평균보다 한쪽으로 더 쏠려 있습니다 — 피부과 금액 비중이 전체기간 43.8%에서 최근 54.5%로 10.7%p 더 높아져, 집중 현상이 일시적이 아니라 계속 강해지는 추세임을 보여줍니다.",
          "대학/종합병원은 전체기간 누적(금액 12.6%·건수 11.4%)보다 최근 1년(금액 7.1%·건수 6.3%)이 더 낮아, 비중 축소가 최근 들어 가속화되고 있습니다.",
          "건수 1위는 전체기간·최근 모두 약국(55.2%→58.6%)으로 변함없고, 금액 1위도 전체기간·최근 모두 피부과로 동일합니다 — 순위 자체보다 쏠림의 '정도'가 계속 커지는 그림입니다.",
        ]}
      />
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
