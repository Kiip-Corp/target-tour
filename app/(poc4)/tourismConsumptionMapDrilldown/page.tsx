import { readFile } from "node:fs/promises";
import path from "node:path";
import * as d3 from "d3";
import TourismDrilldownBubbleMap from "./TourismDrilldownBubbleMap";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";
import { SEOUL_GU_CODES } from "../../_koreaBubbleMap/seoulGuCodes";
import { GANGNAM_DONG } from "../../_koreaBubbleMap/gangnamDong";
import InsightBox from "../InsightBox";

// poc4 1번째 페이지처럼 지역 색상(면적)으로 빈도를 표시한다. 강남구 레벨은 실측 행정동 폴리곤이
// 없어(아래 emd 주석 참고) KoreaBubbleMap이 근사 좌표로 Voronoi 구획을 만들어 색칠한다.
const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

async function readCsv(...segments: string[]) {
  const file = path.join(process.cwd(), "data", ...segments);
  const raw = await readFile(file, "utf-8");
  return raw
    .replace(/^﻿/, "")
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => line.split(","));
}

export default async function TourismConsumptionMapDrilldownPage() {
  const nationRows = await readCsv("6전국연간", "20260807114305_지역별 지출액.csv");
  const nationShare = new Map<string, number>();
  for (const [gwang, , gwangRatio] of nationRows) {
    if (!nationShare.has(gwang)) nationShare.set(gwang, Number(gwangRatio));
  }
  const nationMax = Math.max(...Array.from(nationShare.values()), 1);
  const sido = SIDO_CODES.map((r) => {
    const count = nationShare.get(r.full) ?? 0;
    return { code: r.code, name: r.short, count, fill: seqColor(count / nationMax) };
  });

  const seoulRows = await readCsv("6서울연간", "20260807112926_지역별 지출액.csv");
  const seoulShare = new Map(seoulRows.map(([gu, ratio]) => [gu, Number(ratio)]));
  const seoulMax = Math.max(...Array.from(seoulShare.values()), 1);
  const sigungu = SEOUL_GU_CODES.map((g) => {
    const count = seoulShare.get(g.name) ?? 0;
    return { code: g.code, name: g.name, count, fill: seqColor(count / seoulMax) };
  });

  const gangnamRows = await readCsv("6서울강남구연간", "20260807114422_지역별 지출액.csv");
  const gangnamShare = new Map(gangnamRows.map(([dong, ratio]) => [dong, Number(ratio)]));
  const gangnamMax = Math.max(...Array.from(gangnamShare.values()), 1);
  const emd = GANGNAM_DONG.map((d) => {
    const count = gangnamShare.get(d.name) ?? 0;
    return { code: d.name, name: d.name, count, fill: seqColor(count / gangnamMax) };
  });

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
        관광소비 지역별 지출액 — 전국 → 서울 → 강남구
      </h1>
      <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 16, lineHeight: 1.6 }}>
        data/6전국연간, data/6서울연간, data/6서울강남구연간 · 지역별 지출액.csv · 마우스 휠로
        지도를 확대하면 전국(17개 시도) → 서울(25개 구) → 강남구(22개 동) 순으로 더 상세한
        지도로 전환됩니다. 지역을 클릭하거나 상단 breadcrumb를 눌러서도 이동할 수 있습니다.
        서울→강남구 구간에만 상세 데이터가 있어 다른 구는 더 깊이 들어가지 않습니다. 모든 레벨을
        지역 색상으로 표시합니다. 다만 강남구 22개 행정동은 실측 경계 폴리곤이 없어(법정동 14개와
        행정동 22개 구획이 다름) 22개 동 주민센터 근사 좌표를 기준으로 Voronoi 구획을 만들어
        강남구 실제 윤곽에 맞춰 잘라낸 것입니다 — 실제 행정동 경계와는 다를 수 있습니다.
      </p>
      <InsightBox
        items={[
          "전국 관광소비의 69.0%가 서울에 집중돼 있고, 경기(8.9%)·인천(7.2%)·부산(6.3%)이 멀찍이 뒤를 잇습니다.",
          "서울 안에서는 중구(명동 일대)가 34.2%로 압도적 1위, 강남구가 24.9%로 2위 — 두 구가 서울 소비의 약 59%를 차지합니다.",
          "강남구 안에서는 삼성1동(27.3%)·역삼1동(16.1%)·압구정동(14.9%) 세 동이 전체의 58%를 차지해, 구 안에서도 소비가 몇 개 동에 매우 쏠려 있습니다.",
        ]}
      />
      <div style={{ border: "1px solid #E7E6E0", borderRadius: 10, padding: 20 }}>
        <TourismDrilldownBubbleMap data={{ sido, sigungu, emd }} />
      </div>
    </div>
  );
}
