"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import MultiLineChart, { type NamedSeries } from "../../_components/MultiLineChart";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../../_koreaBubbleMap/KoreaBubbleMap";
import type { CountryBoard, MedicalRegionYear } from "./data";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SURFACE = "#FBFBF8";

const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

// 지표 3종 색 — dataviz 검증 팔레트 슬롯 1~3(blue/orange/aqua).
const METRIC_COLORS = { visit: "#2a78d6", spend: "#eb6834", medical: "#1baf7a" } as const;

const MAP_W = 700;
const MAP_H = 910;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const fmtPct = d3.format(".1f");
const fmtWon = d3.format(",");
const fmtCompact = d3.format("~s");

type RegionMetric = "visit" | "spend";
type MedicalMetric = "count" | "amount";

function peakMonth(byMonth: Record<number, number> | undefined) {
  if (!byMonth) return null;
  const entries = Object.entries(byMonth).filter(([, v]) => v > 0);
  if (entries.length === 0) return null;
  const [m, v] = entries.reduce((a, b) => (b[1] > a[1] ? b : a));
  return { month: Number(m), value: v };
}

function SummaryCard({
  title,
  headline,
  sub,
  color,
}: {
  title: string;
  headline: string;
  sub: string;
  color: string;
}) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", background: "#fff", flex: "1 1 180px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: color, display: "block" }} />
        <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: INK, lineHeight: 1.25 }}>{headline}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

function Toggle<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div style={{ display: "flex", border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          style={{
            padding: "6px 14px",
            border: "none",
            background: value === o.value ? INK : "#fff",
            color: value === o.value ? "#fff" : MUTED,
            cursor: "pointer",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Panel({
  step,
  title,
  question,
  note,
  right,
  children,
}: {
  step: string;
  title: string;
  question: string;
  note: string;
  right?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 18, marginBottom: 18, background: SURFACE }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#fff",
                background: INK,
                borderRadius: 4,
                padding: "2px 6px",
              }}
            >
              {step}
            </span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>{title}</h2>
          </div>
          <div style={{ fontSize: 11.5, color: MUTED, marginTop: 5 }}>{question}</div>
          <div style={{ fontSize: 10.5, color: "#9AA1A9", marginTop: 3 }}>{note}</div>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function RankList({
  rows,
  format,
}: {
  rows: { code: string; short: string; value: number }[];
  format: (n: number) => string;
}) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, background: "#fff" }}>
      {rows.map((r, i) => (
        <div
          key={r.code}
          style={{
            display: "grid",
            gridTemplateColumns: "16px 1fr auto",
            gap: 6,
            alignItems: "center",
            padding: "4px 2px",
          }}
        >
          <span style={{ fontSize: 10, color: MUTED }}>{i + 1}</span>
          <span style={{ fontSize: 12, color: i < 3 ? INK : MUTED, fontWeight: i < 3 ? 600 : 400 }}>{r.short}</span>
          <span style={{ fontSize: 11, color: MUTED }}>{format(r.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function MarketingBoard({
  boards,
  medical,
}: {
  boards: CountryBoard[];
  medical: MedicalRegionYear;
}) {
  const [country, setCountry] = useState(boards[0]?.label ?? "");
  const [tourYear, setTourYear] = useState(2025);
  const [regionMetric, setRegionMetric] = useState<RegionMetric>("visit");
  const [medicalMetric, setMedicalMetric] = useState<MedicalMetric>("count");
  const [medicalYear, setMedicalYear] = useState(medical.years[medical.years.length - 1]);

  const board = boards.find((b) => b.label === country) ?? boards[0];

  const visit = board?.visitByYear[tourYear];
  const spend = board?.spendByYear[tourYear];
  const med = board?.medicalByYear[tourYear];

  const peakVisit = peakMonth(visit);
  const peakSpend = peakMonth(spend);
  const peakMedical = peakMonth(med);

  // 지역 1위는 6개국 모두 서울이라 정보량이 없다 — 서울을 뺀 2순위를 같이 보여줘야
  // "서울 외에 어디를 노릴지"라는 실제 의사결정에 쓸 수 있다.
  const topRegion = useMemo(() => {
    const rows = regionMetric === "visit" ? board?.regionVisit : board?.regionSpend;
    if (!rows) return null;
    const sorted = [...rows].sort((a, b) => b.value - a.value);
    const exSeoul = sorted.filter((r) => r.full !== "서울특별시");
    return { first: sorted[0], second: exSeoul[0] };
  }, [board, regionMetric]);

  // 세 지표는 단위가 전혀 다르다(% vs 원) — dual-axis는 금지이므로 각 지표를 자기 최대월=100으로
  // 지수화해 "언제 몰리는지"만 한 축에서 비교한다. 실제 값은 아래 요약 카드와 툴팁에서 확인.
  const indexedSeries: NamedSeries[] = useMemo(() => {
    const build = (label: string, color: string, byMonth: Record<number, number> | undefined) => {
      const max = Math.max(...MONTHS.map((m) => byMonth?.[m] ?? 0), 0);
      return {
        label,
        color,
        points: MONTHS.filter((m) => byMonth?.[m] !== undefined).map((m) => ({
          year: m,
          value: max > 0 ? ((byMonth?.[m] ?? 0) / max) * 100 : 0,
        })),
      };
    };
    return [
      build("방문", METRIC_COLORS.visit, visit),
      build("관광소비", METRIC_COLORS.spend, spend),
      build("의료소비", METRIC_COLORS.medical, med),
    ];
  }, [visit, spend, med]);

  const regionRows = useMemo(() => {
    const rows = regionMetric === "visit" ? board?.regionVisit ?? [] : board?.regionSpend ?? [];
    return [...rows].sort((a, b) => b.value - a.value);
  }, [board, regionMetric]);

  const regionMax = Math.max(...regionRows.map((r) => r.value), 1);
  const regionMapData: KoreaMapData = useMemo(
    () => ({
      sido: regionRows.map((r) => ({
        code: r.code,
        name: r.short,
        count: r.value,
        fill: seqColor(r.value / regionMax),
      })),
    }),
    [regionRows, regionMax]
  );

  const medicalRows = useMemo(
    () => [...(medical.byYear[medicalYear] ?? [])].sort((a, b) => b[medicalMetric] - a[medicalMetric]),
    [medical, medicalYear, medicalMetric]
  );
  const medicalMax = Math.max(...medicalRows.map((r) => r[medicalMetric]), 1);
  const medicalMapData: KoreaMapData = useMemo(
    () => ({
      sido: medicalRows.map((r) => ({
        code: r.code,
        name: r.short,
        count: r[medicalMetric],
        fill: seqColor(r[medicalMetric] / medicalMax),
      })),
    }),
    [medicalRows, medicalMetric, medicalMax]
  );

  const medicalUnit = medicalMetric === "count" ? "건" : "원";
  const medicalLabel = medicalMetric === "count" ? "의료 소비건수" : "의료 소비액";

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      {/* 국가 선택 — 이 보드 전체(패널 1·2)의 기준이 된다 */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#fff",
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          padding: 14,
          marginBottom: 18,
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, color: MUTED, letterSpacing: "0.06em" }}>타깃 국가</span>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {boards.map((b) => {
              const on = b.label === country;
              return (
                <button
                  key={b.label}
                  onClick={() => setCountry(b.label)}
                  aria-pressed={on}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${on ? b.color : BORDER}`,
                    background: on ? b.color : "#fff",
                    color: on ? "#fff" : MUTED,
                    cursor: "pointer",
                    fontFamily: "ui-monospace, monospace",
                    fontSize: 12,
                    fontWeight: on ? 700 : 500,
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>
          <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>기준연도</span>
          <select
            aria-label="기준연도"
            value={tourYear}
            onChange={(e) => setTourYear(Number(e.target.value))}
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 6,
              padding: "5px 8px",
              fontFamily: "ui-monospace, monospace",
              fontSize: 12,
              color: INK,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            {[2020, 2021, 2022, 2023, 2024, 2025].map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 핵심 요약 — 선택 국가/연도 기준 한 줄 결론 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <SummaryCard
          title="가장 많이 방문한 달"
          color={METRIC_COLORS.visit}
          headline={peakVisit ? `${peakVisit.month}월` : "데이터 없음"}
          sub={peakVisit ? `서울 방문객 중 ${fmtPct(peakVisit.value)}%` : `${tourYear}년 자료 없음`}
        />
        <SummaryCard
          title="가장 많이 관광소비한 달"
          color={METRIC_COLORS.spend}
          headline={peakSpend ? `${peakSpend.month}월` : "데이터 없음"}
          sub={peakSpend ? `서울 관광소비 중 ${fmtPct(peakSpend.value)}%` : `${tourYear}년 자료 없음`}
        />
        <SummaryCard
          title="가장 많이 의료소비한 달"
          color={METRIC_COLORS.medical}
          headline={peakMedical ? `${peakMedical.month}월` : "데이터 없음"}
          sub={peakMedical ? `${fmtWon(Math.round(peakMedical.value))}원` : `${tourYear}년 자료 없음`}
        />
        <SummaryCard
          title={`가장 많이 ${regionMetric === "visit" ? "방문한" : "소비한"} 지역`}
          color={SEQ_HIGH}
          headline={topRegion?.first ? topRegion.first.short : "-"}
          sub={
            topRegion?.first && topRegion.second
              ? `${fmtPct(topRegion.first.value)}% · 서울 외 1위 ${topRegion.second.short}(${fmtPct(topRegion.second.value)}%)`
              : ""
          }
        />
      </div>

      <Panel
        step="1"
        title="언제 — 월별 성수기"
        question={`${country} 관광객은 ${tourYear}년 몇 월에 가장 많이 오고, 쓰고, 치료받았나?`}
        note="세 지표는 단위가 달라(% vs 원) 각 지표의 최대월을 100으로 지수화했습니다 — 값의 크기가 아니라 '몰리는 시점'을 비교하는 차트입니다."
      >
        <MultiLineChart
          key={`${country}-${tourYear}`}
          series={indexedSeries}
          years={MONTHS}
          defaultVisible={["방문", "관광소비", "의료소비"]}
          groupLabel="지표"
          valueLabel="최대월 = 100 지수"
          formatPeriod={(n) => `${n}월`}
          formatValue={(n) => fmtPct(n)}
          axisLabel={`기준월 (${tourYear}년)`}
        />
      </Panel>

      <Panel
        step="2"
        title="어디에 — 국가별 지역 분포"
        question={`${country} 관광객은 전국 17개 시도 중 어디에 가고, 어디서 쓰나?`}
        note="7번 연간 스냅샷이라 월 구분이 없습니다 — 패널 1의 '언제'와는 교차되지 않습니다."
        right={
          <Toggle
            value={regionMetric}
            onChange={setRegionMetric}
            options={[
              { value: "visit", label: "방문자 비율" },
              { value: "spend", label: "관광소비 비율" },
            ]}
          />
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 200px", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <KoreaBubbleMap
              key={`region-${country}-${regionMetric}`}
              data={regionMapData}
              width={MAP_W}
              height={MAP_H}
              showBubbles={false}
              enableSeoulDrilldown={false}
              countLabel={regionMetric === "visit" ? "방문자 비율" : "관광소비 비율"}
              countPostfix="%"
              customTooltip={({ name, count }: TooltipProps) => (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                  <div style={{ color: MUTED }}>
                    {regionMetric === "visit" ? "방문자" : "관광소비"} 비율{" "}
                    <b style={{ color: INK }}>{fmtPct(count)}%</b>
                  </div>
                </div>
              )}
            />
          </div>
          <RankList rows={regionRows} format={(n) => `${fmtPct(n)}%`} />
        </div>
      </Panel>

      <Panel
        step="3"
        title="의료관광 — 지역별 의료 소비"
        question="외국인 의료관광 소비는 어느 지역에 몰리나?"
        note="5번 데이터는 국가 구분이 없어 전체 외국인 합계 기준입니다 — 위에서 고른 타깃 국가와는 교차되지 않습니다."
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <select
              aria-label="의료 기준연도"
              value={medicalYear}
              onChange={(e) => setMedicalYear(Number(e.target.value))}
              style={{
                border: `1px solid ${BORDER}`,
                borderRadius: 6,
                padding: "5px 8px",
                fontFamily: "ui-monospace, monospace",
                fontSize: 12,
                color: INK,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {medical.years.map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>
            <Toggle
              value={medicalMetric}
              onChange={setMedicalMetric}
              options={[
                { value: "count", label: "소비건수" },
                { value: "amount", label: "소비액" },
              ]}
            />
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 200px", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <KoreaBubbleMap
              key={`medical-${medicalYear}-${medicalMetric}`}
              data={medicalMapData}
              width={MAP_W}
              height={MAP_H}
              showBubbles={false}
              enableSeoulDrilldown={false}
              countLabel={medicalLabel}
              countPostfix={medicalUnit}
              customTooltip={({ name, count }: TooltipProps) => (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                  <div style={{ color: MUTED }}>
                    {medicalLabel}{" "}
                    <b style={{ color: INK }}>
                      {fmtWon(Math.round(count))}
                      {medicalUnit}
                    </b>
                  </div>
                </div>
              )}
            />
          </div>
          <RankList
            rows={medicalRows.map((r) => ({ code: r.code, short: r.short, value: r[medicalMetric] }))}
            format={fmtCompact}
          />
        </div>
      </Panel>
    </div>
  );
}
