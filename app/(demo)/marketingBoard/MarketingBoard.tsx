"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import MultiLineChart, { type NamedSeries } from "../../_components/MultiLineChart";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../../_koreaBubbleMap/KoreaBubbleMap";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";
import type { CountryBoard, MedicalRegionData, TourData } from "./data";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SURFACE = "#FBFBF8";

const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

// 지표 4종 색 — dataviz 검증 팔레트 슬롯 1~4(blue/orange/aqua/purple).
const METRIC_COLORS = { visit: "#2a78d6", spend: "#eb6834", medical: "#1baf7a", regionMedical: "#8a5cf6" } as const;

const MAP_W = 700;
const MAP_H = 910;
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);
const ALL = "ALL";

/** 방문지 선택지 — 지도와 같은 17개 시도. data.ts는 서버 전용이라 원본에서 직접 가져온다. */
const REGIONS = SIDO_CODES;

const fmtPct = d3.format(".1f");
const fmtWon = d3.format(",");
const fmtPeople = d3.format(",");

/**
 * 관광소비·의료소비 원자료는 둘 다 천원 단위 — 억/조로 접어야 지도 툴팁과 랭크에 들어간다.
 * 의료 쪽 CSV에는 단위 표기가 없지만, 소비액 ÷ 소비건수가 건당 40만원대라 천원이 맞다
 * (원으로 읽으면 건당 400원대가 되어 말이 안 된다).
 */
function fmtSpend(thousandWon: number) {
  const won = thousandWon * 1000;
  if (won >= 1e12) return `${(won / 1e12).toFixed(1)}조원`;
  if (won >= 1e8) return `${fmtWon(Math.round(won / 1e8))}억원`;
  if (won >= 1e4) return `${fmtWon(Math.round(won / 1e4))}만원`;
  return `${fmtWon(Math.round(won))}원`;
}

type RegionMetric = "visit" | "spend";
type HeatMode = "share" | "volume";

type Estimate = { visitors: number; spend: number; totalVisitors: number; totalSpend: number };

const EMPTY: Estimate = { visitors: 0, spend: 0, totalVisitors: 0, totalSpend: 0 };

const add = (a: Estimate, b: Estimate): Estimate => ({
  visitors: a.visitors + b.visitors,
  spend: a.spend + b.spend,
  totalVisitors: a.totalVisitors + b.totalVisitors,
  totalSpend: a.totalSpend + b.totalSpend,
});

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

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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
  highlight,
  onPick,
}: {
  rows: { code: string; short: string; value: number }[];
  format: (n: number) => string;
  highlight?: string;
  onPick?: (code: string) => void;
}) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: 12, background: "#fff" }}>
      {rows.map((r, i) => {
        const on = highlight === r.code;
        return (
          <div
            key={r.code}
            onClick={onPick ? () => onPick(r.code) : undefined}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr auto",
              gap: 6,
              alignItems: "center",
              padding: "4px 4px",
              borderRadius: 4,
              cursor: onPick ? "pointer" : "default",
              background: on ? "#EEF4FD" : "transparent",
            }}
          >
            <span style={{ fontSize: 10, color: MUTED }}>{i + 1}</span>
            <span style={{ fontSize: 12, color: i < 3 || on ? INK : MUTED, fontWeight: i < 3 || on ? 600 : 400 }}>
              {r.short}
            </span>
            <span style={{ fontSize: 11, color: MUTED }}>{format(r.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function MarketingBoard({
  tour,
  medical,
}: {
  tour: TourData;
  medical: MedicalRegionData;
}) {
  const fullYears = tour.years.filter((y) => (tour.monthsByYear[y]?.length ?? 0) === 12);
  const defaultYear = fullYears[fullYears.length - 1] ?? tour.years[tour.years.length - 1];

  const [country, setCountry] = useState(tour.boards[0]?.label ?? "");
  const [tourYear, setTourYear] = useState(defaultYear);
  const [regionCode, setRegionCode] = useState<string>(ALL);
  const [month, setMonth] = useState<string>(ALL);
  const [regionMetric, setRegionMetric] = useState<RegionMetric>("visit");
  const [heatMode, setHeatMode] = useState<HeatMode>("share");

  const board: CountryBoard | undefined = tour.boards.find((b) => b.label === country) ?? tour.boards[0];
  const months = tour.monthsByYear[tourYear] ?? MONTHS;
  const regionName = regionCode === ALL ? "전국" : REGIONS.find((r) => r.code === regionCode)?.short ?? "전국";
  const monthName = month === ALL ? `${tourYear}년 연간` : `${tourYear}년 ${month}월`;

  /**
   * 국가 × 지역 × 월 추정치. 데이터랩은 시도별 "전체 외국인" 절대값과 그중 해당 국가 비율(%)을
   * 따로 주기 때문에 둘을 곱해 국가별 절대값을 만든다 — 그래서 지도·랭크 값은 모두 추정치다.
   * 연 단위로 합산하면 데이터랩이 별도로 주는 연간 지역분포 비율과 소수점 첫째 자리까지 일치한다.
   */
  const cell = useMemo(() => {
    // 자료가 없는 칸은 null로 남긴다. 0으로 채우면 2026년 광주·전남(시도 개편으로 6월까지만
    // 집계)처럼 "그 달엔 아무도 안 왔다"로 읽혀버린다.
    return (year: number, code: string, m: number): Estimate | null => {
      const t = tour.totals[year]?.[code]?.[m];
      if (!t) return null;
      const s = board?.shareByYear[year]?.[code]?.[m];
      return {
        visitors: s?.visit !== undefined ? (t.visitors * s.visit) / 100 : 0,
        spend: s?.spend !== undefined ? (t.spend * s.spend) / 100 : 0,
        totalVisitors: t.visitors,
        totalSpend: t.spend,
      };
    };
  }, [tour, board]);

  /** 여러 칸을 더한다. 전부 결측이면 null — 합계 0과 구분한다. */
  const sum = (cells: (Estimate | null)[]) => {
    const has = cells.filter((c): c is Estimate => c !== null);
    return has.length === 0 ? null : has.reduce(add, EMPTY);
  };

  /** 선택 지역(또는 전국 합계)의 월별 추정치. */
  const byMonth = useMemo(() => {
    const out: Record<number, Estimate | null> = {};
    for (const m of months) {
      out[m] =
        regionCode === ALL
          ? sum(REGIONS.map((r) => cell(tourYear, r.code, m)))
          : cell(tourYear, regionCode, m);
    }
    return out;
  }, [cell, months, regionCode, tourYear]);

  /** 선택 월(또는 연간 합계)의 시도별 추정치. */
  const byRegion = useMemo(() => {
    const pick = month === ALL ? months : [Number(month)];
    return REGIONS.map((r) => ({ ...r, ...(sum(pick.map((m) => cell(tourYear, r.code, m))) ?? EMPTY) }));
  }, [cell, month, months, tourYear]);

  const med = board?.medicalByYear[tourYear];

  // 결측 달은 키 자체를 빼서 차트에서도 선이 0으로 떨어지지 않게 한다.
  const visitSeries = useMemo(
    () => Object.fromEntries(months.filter((m) => byMonth[m]).map((m) => [m, byMonth[m]!.visitors])),
    [byMonth, months]
  );
  const spendSeries = useMemo(
    () => Object.fromEntries(months.filter((m) => byMonth[m]).map((m) => [m, byMonth[m]!.spend])),
    [byMonth, months]
  );

  const medicalSeries = useMemo(
    () => Object.fromEntries(Object.entries(med ?? {}).map(([m, v]) => [Number(m), v.amount])),
    [med]
  );

  /**
   * 5번이 월 단위가 되면서 생긴 선택 방문지의 의료소비 추이. 4번(국가별)과 축이 다르다 —
   * 이쪽은 지역이 맞물리는 대신 국가 구분이 없는 전체 외국인 합계다.
   */
  const regionMedicalSeries = useMemo(() => {
    const out: Record<number, number> = {};
    for (const m of medical.monthsByYear[tourYear] ?? []) {
      if (regionCode === ALL) {
        const nation = medical.nationwide[tourYear]?.[m];
        if (nation) out[m] = nation.amount;
      } else {
        const cell = medical.byYearMonth[tourYear]?.[m]?.[regionCode];
        if (cell) out[m] = cell.amount;
      }
    }
    return out;
  }, [medical, tourYear, regionCode]);

  const peakVisit = peakMonth(visitSeries);
  const peakSpend = peakMonth(spendSeries);
  const peakMedical = peakMonth(medicalSeries);
  const peakMedicalCell = peakMedical ? med?.[peakMedical.month] : undefined;

  // 지역 1위는 6개국 모두 서울이라 정보량이 없다 — 서울을 뺀 2순위를 같이 보여줘야
  // "서울 외에 어디를 노릴지"라는 실제 의사결정에 쓸 수 있다.
  const regionRows = useMemo(() => {
    const key = regionMetric === "visit" ? "visitors" : "spend";
    return [...byRegion].sort((a, b) => b[key] - a[key]);
  }, [byRegion, regionMetric]);

  const topRegion = useMemo(() => {
    const exSeoul = regionRows.filter((r) => r.full !== "서울특별시");
    return { first: regionRows[0], second: exSeoul[0] };
  }, [regionRows]);

  const regionTotal = useMemo(
    () => regionRows.reduce((s, r) => s + (regionMetric === "visit" ? r.visitors : r.spend), 0),
    [regionRows, regionMetric]
  );

  // 네 지표는 단위가 다르다(방문 = 명, 나머지 셋 = 천원) — dual-axis는 금지이므로 각 지표를 자기 최대월=100으로
  // 지수화해 "언제 몰리는지"만 한 축에서 비교한다. 실제 값은 아래 요약 카드와 툴팁에서 확인.
  const indexedSeries: NamedSeries[] = useMemo(() => {
    const build = (label: string, color: string, series: Record<number, number>) => {
      const max = Math.max(...months.map((m) => series[m] ?? 0), 0);
      return {
        label,
        color,
        points: months
          .filter((m) => series[m] !== undefined)
          .map((m) => ({ year: m, value: max > 0 ? ((series[m] ?? 0) / max) * 100 : 0 })),
      };
    };
    return [
      build("방문", METRIC_COLORS.visit, visitSeries),
      build("관광소비", METRIC_COLORS.spend, spendSeries),
      build("의료소비·국가", METRIC_COLORS.medical, medicalSeries),
      build("의료소비·지역", METRIC_COLORS.regionMedical, regionMedicalSeries),
    ];
  }, [visitSeries, spendSeries, medicalSeries, regionMedicalSeries, months]);

  const regionValue = (r: (typeof byRegion)[number]) => (regionMetric === "visit" ? r.visitors : r.spend);
  const regionMax = Math.max(...regionRows.map(regionValue), 1);
  const formatRegion = (n: number) => (regionMetric === "visit" ? `${fmtPeople(Math.round(n))}명` : fmtSpend(n));

  const regionMapData: KoreaMapData = useMemo(
    () => ({
      sido: regionRows.map((r) => ({
        code: r.code,
        name: r.short,
        count: regionValue(r),
        fill: seqColor(regionValue(r) / regionMax),
      })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [regionRows, regionMetric, regionMax]
  );

  /**
   * 지역 × 월 히트맵 — 새로 받은 전국 월간 자료로만 가능한 단면.
   * "share" = 각 지역을 자기 연간 합계로 나눈 월 비중(성수기가 지역마다 다른지),
   * "volume" = 전국 최대 셀 기준 절대량(어디에 실제 물량이 있는지).
   */
  const heat = useMemo(() => {
    const key = regionMetric === "visit" ? "visitors" : "spend";
    const rows = [...byRegion]
      .map((r) => {
        const values: Record<number, number | null> = {};
        for (const m of months) {
          const c = cell(tourYear, r.code, m);
          values[m] = c ? c[key] : null;
        }
        const total = months.reduce((acc, m) => acc + (values[m] ?? 0), 0);
        return { code: r.code, short: r.short, values, total };
      })
      .sort((a, b) => b.total - a.total);
    const volumeMax = Math.max(...rows.flatMap((r) => months.map((m) => r.values[m] ?? 0)), 1);
    // 월 비중은 각 행의 최대월을 진하게(=1) 잡는다. 연평균(1/12)을 1로 잡으면 성수기가 아닌 달도
    // 전부 최대 색으로 뭉개져 지역별 패턴 차이가 보이지 않는다.
    return {
      rows: rows.map((r) => ({ ...r, max: Math.max(...months.map((m) => r.values[m] ?? 0), 0) })),
      volumeMax,
    };
  }, [byRegion, cell, months, regionMetric, tourYear]);

  const metricWord = regionMetric === "visit" ? "방문" : "관광소비";

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      {/* 국가 · 연도 · 방문지 — 패널 1~3 전체의 기준이 된다 */}
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
            {tour.boards.map((b) => {
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
          <Select
            label="기준연도"
            value={String(tourYear)}
            onChange={(v) => {
              const next = Number(v);
              setTourYear(next);
              // 연도를 바꾸면 그 해에 없는 달이 선택돼 있을 수 있다(2026은 상반기까지).
              if (month !== ALL && !(tour.monthsByYear[next] ?? []).includes(Number(month))) setMonth(ALL);
            }}
            options={tour.years.map((y) => ({
              value: String(y),
              label:
                (tour.monthsByYear[y]?.length ?? 12) < 12
                  ? `${y}년 (1~${Math.max(...(tour.monthsByYear[y] ?? [12]))}월)`
                  : `${y}년`,
            }))}
          />

          <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>방문지</span>
          <Select
            label="방문지"
            value={regionCode}
            onChange={setRegionCode}
            options={[
              { value: ALL, label: "전국 17개 시도" },
              ...REGIONS.map((r) => ({ value: r.code, label: r.full })),
            ]}
          />
        </div>
      </div>

      {/* 핵심 요약 — 선택 국가/연도/방문지 기준 한 줄 결론 */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <SummaryCard
          title={`${regionName} 최다 방문 월`}
          color={METRIC_COLORS.visit}
          headline={peakVisit ? `${peakVisit.month}월` : "데이터 없음"}
          sub={
            peakVisit
              ? `추정 ${fmtPeople(Math.round(peakVisit.value))}명 · ${regionName} 외국인의 ${fmtPct(
                  (peakVisit.value / (byMonth[peakVisit.month]?.totalVisitors || 1)) * 100
                )}%`
              : `${tourYear}년 자료 없음`
          }
        />
        <SummaryCard
          title={`${regionName} 최다 관광소비 월`}
          color={METRIC_COLORS.spend}
          headline={peakSpend ? `${peakSpend.month}월` : "데이터 없음"}
          sub={
            peakSpend
              ? `추정 ${fmtSpend(peakSpend.value)} · ${regionName} 관광소비의 ${fmtPct(
                  (peakSpend.value / (byMonth[peakSpend.month]?.totalSpend || 1)) * 100
                )}%`
              : `${tourYear}년 자료 없음`
          }
        />
        <SummaryCard
          title="최다 의료소비 월 (전국)"
          color={METRIC_COLORS.medical}
          headline={peakMedical ? `${peakMedical.month}월` : "데이터 없음"}
          sub={
            peakMedical && peakMedicalCell
              ? `${fmtSpend(peakMedical.value)} · ${fmtPeople(
                  Math.round(peakMedicalCell.count)
                )}건 · 전체 외국인 의료소비의 ${fmtPct(peakMedicalCell.amountShare)}%`
              : `${tourYear}년 자료 없음`
          }
        />
        <SummaryCard
          title={`최다 ${metricWord} 지역 · ${monthName}`}
          color={SEQ_HIGH}
          headline={topRegion.first ? topRegion.first.short : "-"}
          sub={
            topRegion.first && topRegion.second
              ? `${formatRegion(regionValue(topRegion.first))} · 서울 외 1위 ${topRegion.second.short}(${formatRegion(
                  regionValue(topRegion.second)
                )})`
              : ""
          }
        />
      </div>

      <Panel
        step="1"
        title="언제 — 월별 성수기"
        question={`${country} 관광객은 ${tourYear}년 ${regionName}에 몇 월에 가장 많이 오고, 쓰고, 치료받았나?`}
        note={`방문·관광소비·의료소비(지역)는 ${regionName} 기준이고, 의료소비(국가)는 ${country} 기준이되 지역 구분이 없어 전국 합계입니다 — 4번은 국가축, 5번은 지역축이라 둘이 겹치지 않습니다. 단위가 달라(방문 = 명, 소비 3종 = 천원) 각 지표의 최대월을 100으로 지수화했습니다 — 값의 크기가 아니라 '몰리는 시점'을 비교하는 차트입니다.`}
      >
        <MultiLineChart
          key={`${country}-${tourYear}-${regionCode}`}
          series={indexedSeries}
          years={months}
          defaultVisible={["방문", "관광소비", "의료소비·국가", "의료소비·지역"]}
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
        question={`${country} 관광객은 ${monthName} 기준 전국 17개 시도 중 어디에 가고, 어디서 쓰나?`}
        note={`데이터랩이 주는 시도별 "전체 외국인" 절대값 × 해당 국가 비율(%)로 계산한 추정치입니다. 지도나 목록에서 지역을 고르면 패널 1의 '언제'가 그 지역 기준으로 바뀝니다.`}
        right={
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <Select
              label="기준월"
              value={month}
              onChange={setMonth}
              options={[{ value: ALL, label: "연간 합계" }, ...months.map((m) => ({ value: String(m), label: `${m}월` }))]}
            />
            <Toggle
              value={regionMetric}
              onChange={setRegionMetric}
              options={[
                { value: "visit", label: "방문자 수" },
                { value: "spend", label: "관광소비액" },
              ]}
            />
          </div>
        }
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <KoreaBubbleMap
              key={`region-${country}-${regionMetric}-${tourYear}-${month}`}
              data={regionMapData}
              width={MAP_W}
              height={MAP_H}
              showBubbles={false}
              enableSeoulDrilldown={false}
              countLabel={regionMetric === "visit" ? "추정 방문자 수" : "추정 관광소비액"}
              customTooltip={({ name, count }: TooltipProps) => (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                  <div style={{ color: MUTED }}>
                    추정 {metricWord} <b style={{ color: INK }}>{formatRegion(count)}</b>
                  </div>
                  <div style={{ color: MUTED, marginTop: 2 }}>
                    전국 대비 <b style={{ color: INK }}>{fmtPct((count / (regionTotal || 1)) * 100)}%</b>
                  </div>
                </div>
              )}
            />
          </div>
          <RankList
            rows={regionRows.map((r) => ({ code: r.code, short: r.short, value: regionValue(r) }))}
            format={formatRegion}
            highlight={regionCode}
            onPick={(code) => setRegionCode(code === regionCode ? ALL : code)}
          />
        </div>
      </Panel>

      <Panel
        step="3"
        title="언제 × 어디에 — 지역별 월 패턴"
        question={`${country} 관광객의 성수기는 지역마다 다른가? (${tourYear}년)`}
        note="'지역 내 월 비중'은 각 지역의 최대월을 가장 진하게 칠해 규모가 작은 지역의 성수기도 보이게 합니다. '절대량'은 전국 최대 셀 기준이라 물량이 어디에 몰려 있는지를 봅니다. 셀에 마우스를 올리면 실제 추정치가 나옵니다."
        right={
          <Toggle
            value={heatMode}
            onChange={setHeatMode}
            options={[
              { value: "share", label: "지역 내 월 비중" },
              { value: "volume", label: "절대량" },
            ]}
          />
        }
      >
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", fontSize: 11, width: "100%", minWidth: 560 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: "4px 8px", color: MUTED, fontWeight: 500 }}>지역 / 월</th>
                {months.map((m) => (
                  <th key={m} style={{ padding: "4px 6px", color: MUTED, fontWeight: 500 }}>
                    {m}
                  </th>
                ))}
                <th style={{ padding: "4px 8px", color: MUTED, fontWeight: 500, textAlign: "right" }}>연간</th>
              </tr>
            </thead>
            <tbody>
              {heat.rows.map((r) => (
                <tr key={r.code}>
                  <td
                    onClick={() => setRegionCode(r.code === regionCode ? ALL : r.code)}
                    style={{
                      padding: "3px 8px",
                      color: r.code === regionCode ? INK : MUTED,
                      fontWeight: r.code === regionCode ? 700 : 400,
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                    }}
                  >
                    {r.short}
                  </td>
                  {months.map((m) => {
                    const v = r.values[m];
                    if (v === null) {
                      return (
                        <td
                          key={m}
                          title={`${r.short} ${m}월 · 자료 없음`}
                          style={{
                            background: "repeating-linear-gradient(45deg,#F1F1EE,#F1F1EE 3px,#fff 3px,#fff 6px)",
                            height: 20,
                            border: "1px solid #fff",
                          }}
                        />
                      );
                    }
                    const t = heatMode === "share" ? (r.max > 0 ? v / r.max : 0) : v / heat.volumeMax;
                    return (
                      <td
                        key={m}
                        title={`${r.short} ${m}월 · 추정 ${formatRegion(v)} · 연간 대비 ${fmtPct(
                          r.total > 0 ? (v / r.total) * 100 : 0
                        )}%`}
                        style={{
                          background: seqColor(Math.min(1, t)),
                          height: 20,
                          border: "1px solid #fff",
                        }}
                      />
                    );
                  })}
                  <td style={{ padding: "3px 8px", color: MUTED, textAlign: "right", whiteSpace: "nowrap" }}>
                    {formatRegion(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, fontSize: 10.5, color: MUTED }}>
          <span>{heatMode === "share" ? "지역 내 비수기" : "0"}</span>
          <span
            style={{
              width: 120,
              height: 8,
              borderRadius: 4,
              background: `linear-gradient(to right, ${SEQ_LOW}, ${SEQ_HIGH})`,
              display: "block",
            }}
          />
          <span>{heatMode === "share" ? "지역 내 성수기" : `전국 최대 ${formatRegion(heat.volumeMax)}`}</span>
          <span
            style={{
              width: 14,
              height: 8,
              marginLeft: 6,
              background: "repeating-linear-gradient(45deg,#F1F1EE,#F1F1EE 3px,#fff 3px,#fff 6px)",
              border: `1px solid ${BORDER}`,
              display: "block",
            }}
          />
          <span>자료 없음</span>
        </div>
      </Panel>
    </div>
  );
}
