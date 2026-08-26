"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import MultiLineChart, { type NamedSeries } from "../../../_components/MultiLineChart";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../../../_koreaBubbleMap/KoreaBubbleMap";
import { SIDO_CODES } from "../../../_koreaBubbleMap/sidoCodes";
import { CATEGORIES } from "../../specialtyTreemap/categories";
import type { MedicalBoardData, SpecialtyShares } from "../data";
import SpecialtyBars, { type SpecialtyRow } from "./SpecialtyBars";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SURFACE = "#FBFBF8";

const SEQ_LOW = "#cde2fb";
const SEQ_HIGH = "#0d366b";
const seqColor = d3.interpolateRgb(SEQ_LOW, SEQ_HIGH);

const MAP_W = 700;
const MAP_H = 910;
const ALL = "ALL";
const REGIONS = SIDO_CODES;

const fmtPct = d3.format(".1f");
const fmtNum = d3.format(",");

/**
 * 의료 소비액 원자료 단위는 천원 — 억/조로 접어야 카드와 툴팁에 들어간다.
 * CSV 헤더에 단위 표기가 없지만, 소비액 ÷ 소비건수가 건당 40만원대라 천원이 맞다
 * (원으로 읽으면 건당 400원대가 되어 말이 안 된다).
 */
function fmtWon(thousandWon: number) {
  const won = thousandWon * 1000;
  if (won >= 1e12) return `${(won / 1e12).toFixed(1)}조원`;
  if (won >= 1e8) return `${fmtNum(Math.round(won / 1e8))}억원`;
  if (won >= 1e4) return `${fmtNum(Math.round(won / 1e4))}만원`;
  return `${fmtNum(Math.round(won))}원`;
}

type Metric = "amount" | "count";

const METRIC_LABEL: Record<Metric, string> = { amount: "의료 소비액", count: "의료 소비건수" };

function SummaryCard({ title, headline, sub, color }: { title: string; headline: string; sub: string; color: string }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px", background: "#fff", flex: "1 1 190px" }}>
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
            <span style={{ fontSize: 10, fontWeight: 700, color: "#fff", background: INK, borderRadius: 4, padding: "2px 6px" }}>
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
            <span style={{ fontSize: 12, color: i < 3 || on ? INK : MUTED, fontWeight: i < 3 || on ? 600 : 400 }}>{r.short}</span>
            <span style={{ fontSize: 11, color: MUTED }}>{format(r.value)}</span>
          </div>
        );
      })}
    </div>
  );
}

/** 진료과목 8종 비율을 하나로 합친다. 여러 달을 볼 때는 소비 규모로 가중평균해야 한다. */
function mergeShares(parts: { shares: SpecialtyShares | undefined; weight: { amount: number; count: number } }[]) {
  const out: Record<string, { amount: number; count: number }> = {};
  const total = { amount: 0, count: 0 };
  for (const p of parts) {
    if (!p.shares) continue;
    total.amount += p.weight.amount;
    total.count += p.weight.count;
    for (const c of CATEGORIES) {
      const v = p.shares[c.key];
      if (!v) continue;
      (out[c.key] ??= { amount: 0, count: 0 }).amount += (v.amount / 100) * p.weight.amount;
      (out[c.key] ??= { amount: 0, count: 0 }).count += (v.count / 100) * p.weight.count;
    }
  }
  const shares: Record<Metric, Record<string, number>> = { amount: {}, count: {} };
  for (const [key, v] of Object.entries(out)) {
    if (total.amount > 0) shares.amount[key] = (v.amount / total.amount) * 100;
    if (total.count > 0) shares.count[key] = (v.count / total.count) * 100;
  }
  return shares;
}

export default function MedicalBoard({ data }: { data: MedicalBoardData }) {
  const fullYears = data.years.filter((y) => (data.monthsByYear[y]?.length ?? 0) === 12);
  const [year, setYear] = useState(fullYears[fullYears.length - 1] ?? data.years[data.years.length - 1]);
  const [month, setMonth] = useState<string>(ALL);
  const [metric, setMetric] = useState<Metric>("amount");
  const [regionCode, setRegionCode] = useState<string>(ALL);

  const months = useMemo(() => data.monthsByYear[year] ?? [], [data.monthsByYear, year]);
  const pickedMonths = month === ALL ? months : months.filter((m) => m === Number(month));
  const period = month === ALL ? `${year}년 연간` : `${year}년 ${month}월`;
  const unitLabel = METRIC_LABEL[metric];
  const fmtValue = (n: number) => (metric === "amount" ? fmtWon(n) : `${fmtNum(Math.round(n))}건`);

  /** 「국가별 의료소비」(자료 4번) — 선택 기간 합계. shares는 전체 외국인 대비 점유율이라 월별로 가중해 합친다. */
  const countryTotals = useMemo(
    () =>
      data.countries.map((c) => {
        const cells = pickedMonths.map((m) => c.byYear[year]?.[m]).filter(Boolean);
        const amount = cells.reduce((a, v) => a + v!.amount, 0);
        const count = cells.reduce((a, v) => a + v!.count, 0);
        // 국가 소비액 ÷ 전체 대비 비율 = 전체 외국인 소비액. 이걸 분모로 삼아 기간 점유율을 낸다.
        const denom = cells.reduce(
          (a, v) => ({
            amount: a.amount + (v!.amountShare > 0 ? (v!.amount / v!.amountShare) * 100 : 0),
            count: a.count + (v!.countShare > 0 ? (v!.count / v!.countShare) * 100 : 0),
          }),
          { amount: 0, count: 0 }
        );
        return {
          label: c.label,
          color: c.color,
          amount,
          count,
          amountShare: denom.amount > 0 ? (amount / denom.amount) * 100 : 0,
          countShare: denom.count > 0 ? (count / denom.count) * 100 : 0,
          denom,
        };
      }),
    [data.countries, pickedMonths, year]
  );

  /** 「지역별 의료소비」(자료 5번)의 "전국" — 시도가 특정되지 않은 소비까지 포함한 진짜 전체값. */
  const nationwide = useMemo(
    () =>
      pickedMonths.reduce(
        (a, m) => {
          const v = data.regions.nationwide[year]?.[m];
          return v ? { amount: a.amount + v.amount, count: a.count + v.count } : a;
        },
        { amount: 0, count: 0 }
      ),
    [data.regions, pickedMonths, year]
  );

  const regionRows = useMemo(() => {
    const rows = REGIONS.map((r) => {
      const cells = pickedMonths.map((m) => data.regions.byYearMonth[year]?.[m]?.[r.code]).filter(Boolean);
      if (cells.length === 0) return null;
      return {
        code: r.code,
        short: r.short,
        amount: cells.reduce((a, v) => a + v!.amount, 0),
        count: cells.reduce((a, v) => a + v!.count, 0),
      };
    }).filter((r): r is NonNullable<typeof r> => r !== null);
    return rows.sort((a, b) => b[metric] - a[metric]);
  }, [data.regions, pickedMonths, year, metric]);

  const regionMax = Math.max(...regionRows.map((r) => r[metric]), 1);
  const regionSum = regionRows.reduce((a, r) => a + r[metric], 0);
  const missingRegions = REGIONS.length - regionRows.length;

  const mapData: KoreaMapData = useMemo(
    () => ({
      sido: regionRows.map((r) => ({ code: r.code, name: r.short, count: r[metric], fill: seqColor(r[metric] / regionMax) })),
    }),
    [regionRows, metric, regionMax]
  );

  /** 패널 1 — 6개국을 같은 축에 놓는다. 단위가 같아 지수화가 필요 없다. */
  const countrySeries: NamedSeries[] = useMemo(
    () =>
      data.countries.map((c) => ({
        label: c.label,
        color: c.color,
        points: months
          .filter((m) => c.byYear[year]?.[m])
          .map((m) => ({ year: m, value: c.byYear[year]![m][metric] })),
      })),
    [data.countries, months, year, metric]
  );

  /** 패널 3 — 국가별 진료과목 구성. 여러 달이면 소비 규모로 가중평균한다. */
  const countrySpecialtyRows: SpecialtyRow[] = useMemo(
    () =>
      data.countries.map((c) => {
        const merged = mergeShares(
          pickedMonths.map((m) => ({
            shares: c.specialtyByYear[year]?.[m],
            weight: c.byYear[year]?.[m] ?? { amount: 0, count: 0 },
          }))
        );
        const total = countryTotals.find((t) => t.label === c.label);
        return {
          key: c.label,
          label: c.label,
          shares: merged[metric],
          note: total ? fmtValue(total[metric]) : undefined,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.countries, pickedMonths, year, metric, countryTotals]
  );

  /**
   * 패널 3 — 지역별 진료과목 구성. 지역 자료는 월 구분이 없어 연 단위 스냅샷을 그대로 쓴다.
   * 위의 기준월과 무관하게 그 해 전체 기준이라는 뜻이라, 패널 설명에 밝혀 둔다.
   */
  const regionSpecialtyRows: SpecialtyRow[] = useMemo(
    () =>
      REGIONS.map((r): (SpecialtyRow & { total: number }) | null => {
        const shares = data.regionSpecialty[r.code]?.[year];
        if (!shares) return null;
        const pick: Record<string, number> = {};
        for (const c of CATEGORIES) if (shares[c.key]) pick[c.key] = shares[c.key][metric];
        // 순서는 그 해 전체 소비 규모 순 — 비율만으로는 큰 지역과 작은 지역이 뒤섞인다.
        const total = months.reduce((a, m) => a + (data.regions.byYearMonth[year]?.[m]?.[r.code]?.[metric] ?? 0), 0);
        return { key: r.code, label: r.short, shares: pick, total };
      })
        .filter((r): r is SpecialtyRow & { total: number } => r !== null)
        .sort((a, b) => b.total - a.total),
    [data.regionSpecialty, data.regions, months, year, metric]
  );

  const topCountry = [...countryTotals].sort((a, b) => b[metric] - a[metric])[0];
  const sixShare = countryTotals.reduce((a, c) => a + (metric === "amount" ? c.amountShare : c.countShare), 0);
  const topRegion = regionRows[0];

  const nationwideSpecialty = useMemo(() => {
    const shares = data.regionSpecialty["전국"]?.[year];
    if (!shares) return null;
    const entries = CATEGORIES.map((c) => ({ key: c.key, value: shares[c.key]?.[metric] ?? 0 }));
    return entries.reduce((a, b) => (b.value > a.value ? b : a));
  }, [data.regionSpecialty, year, metric]);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
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
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontSize: 11, color: MUTED, letterSpacing: "0.06em" }}>기준연도</span>
        <Select
          label="기준연도"
          value={String(year)}
          onChange={(v) => {
            const next = Number(v);
            setYear(next);
            // 연도를 바꾸면 그 해에 없는 달이 선택돼 있을 수 있다(2026은 7월까지).
            if (month !== ALL && !(data.monthsByYear[next] ?? []).includes(Number(month))) setMonth(ALL);
          }}
          options={data.years.map((y) => {
            const ms = data.monthsByYear[y] ?? [];
            return { value: String(y), label: ms.length < 12 ? `${y}년 (1~${Math.max(...ms)}월)` : `${y}년` };
          })}
        />

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 8 }}>기준월</span>
        <Select
          label="기준월"
          value={month}
          onChange={setMonth}
          options={[{ value: ALL, label: "연간 합계" }, ...months.map((m) => ({ value: String(m), label: `${m}월` }))]}
        />

        <div style={{ marginLeft: 8 }}>
          <Toggle
            value={metric}
            onChange={setMetric}
            options={[
              { value: "amount", label: "소비액" },
              { value: "count", label: "소비건수" },
            ]}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 18 }}>
        <SummaryCard
          title={`전체 외국인 ${unitLabel} · ${period}`}
          color={SEQ_HIGH}
          headline={nationwide[metric] > 0 ? fmtValue(nationwide[metric]) : "데이터 없음"}
          sub="「지역별 의료소비」의 전국 값 — 시도가 특정되지 않은 소비까지 포함"
        />
        <SummaryCard
          title="최다 국가"
          color={topCountry?.color ?? INK}
          headline={topCountry ? topCountry.label : "-"}
          sub={
            topCountry
              ? `${fmtValue(topCountry[metric])} · 전체 외국인의 ${fmtPct(
                  metric === "amount" ? topCountry.amountShare : topCountry.countShare
                )}%`
              : ""
          }
        />
        <SummaryCard
          title="6개국 합계 점유율"
          color="#4a3aa7"
          headline={`${fmtPct(sixShare)}%`}
          sub="일본·중국·미국·대만·태국·홍콩 / 전체 외국인"
        />
        <SummaryCard
          title="최다 지역"
          color={SEQ_HIGH}
          headline={topRegion ? topRegion.short : "-"}
          sub={topRegion ? `${fmtValue(topRegion[metric])} · 17개 시도의 ${fmtPct((topRegion[metric] / (regionSum || 1)) * 100)}%` : ""}
        />
        <SummaryCard
          title={`최다 진료과목 · ${year}년`}
          color={CATEGORIES.find((c) => c.key === nationwideSpecialty?.key)?.color ?? INK}
          headline={nationwideSpecialty ? nationwideSpecialty.key : "-"}
          sub={nationwideSpecialty ? `전국 ${unitLabel}의 ${fmtPct(nationwideSpecialty.value)}%` : ""}
        />
      </div>

      <Panel
        step="1"
        title="누가 — 국가별 월별 의료소비"
        question={`${year}년, 어느 나라 외국인이 몇 월에 가장 많이 치료받았나?`}
        note={`「국가별 의료소비」 자료입니다. 6개국을 같은 축에 놓았습니다 — 단위가 같아 지수화가 필요 없습니다. 다만 이 자료는 지역 구분이 없는 전국 합계라, 아래 패널 2의 지역 분포와는 교차되지 않습니다.`}
      >
        <MultiLineChart
          key={`countries-${year}-${metric}`}
          series={countrySeries}
          years={months}
          defaultVisible={data.countries.map((c) => c.label)}
          groupLabel="국가"
          valueLabel={metric === "amount" ? `${unitLabel} (천원)` : `${unitLabel} (건)`}
          formatPeriod={(n) => `${n}월`}
          formatValue={(n) => fmtValue(n)}
          axisLabel={`기준월 (${year}년)`}
        />
      </Panel>

      <Panel
        step="2"
        title="어디에 — 지역별 의료소비"
        question={`외국인 의료관광 소비는 ${period} 기준 어느 시도에 몰리나?`}
        note={`「지역별 의료소비」 자료입니다. 국가 구분이 없어 전체 외국인 합계 기준입니다.${
          nationwide[metric] > 0
            ? ` 17개 시도 합계는 데이터랩 "전국" 값의 ${fmtPct((regionSum / nationwide[metric]) * 100)}%로, 나머지는 시도가 특정되지 않은 소비입니다.`
            : ""
        }${missingRegions > 0 ? ` 이 기간 자료가 없는 시도 ${missingRegions}곳은 지도·목록에서 빠집니다.` : ""}`}
      >
        <div style={{ display: "grid", gridTemplateColumns: "minmax(260px,1fr) 220px", gap: 16 }}>
          <div style={{ position: "relative" }}>
            <KoreaBubbleMap
              key={`region-${year}-${month}-${metric}`}
              data={mapData}
              width={MAP_W}
              height={MAP_H}
              showBubbles={false}
              enableSeoulDrilldown={false}
              countLabel={unitLabel}
              customTooltip={({ name, count }: TooltipProps) => (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                  <div style={{ color: MUTED }}>
                    {unitLabel} <b style={{ color: INK }}>{fmtValue(count)}</b>
                  </div>
                  <div style={{ color: MUTED, marginTop: 2 }}>
                    17개 시도 대비 <b style={{ color: INK }}>{fmtPct((count / (regionSum || 1)) * 100)}%</b>
                  </div>
                </div>
              )}
            />
          </div>
          <RankList
            rows={regionRows.map((r) => ({ code: r.code, short: r.short, value: r[metric] }))}
            format={fmtValue}
            highlight={regionCode}
            onPick={(code) => setRegionCode(code === regionCode ? ALL : code)}
          />
        </div>
      </Panel>

      <Panel
        step="3"
        title="무엇을 — 진료과목 구성"
        question={`${period} 기준, 어느 진료과목에 쓰나? 국가마다 · 지역마다 다른가?`}
        note={`국가별은 「국가별 의료소비」의 월별 비율을 기간 소비 규모로 가중평균했습니다. 지역별은 데이터랩이 진료과목을 월별로 주지 않아 ${year}년 전체를 뭉갠 값이며, 위의 기준월을 따르지 않습니다. 8% 이상 구간에는 값을 직접 표시했고, 전체 수치는 '표로 보기'에서 볼 수 있습니다.`}
      >
        <div style={{ display: "grid", gap: 22 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 10 }}>
              국가별 · {period} · {unitLabel} 기준
            </div>
            <SpecialtyBars rows={countrySpecialtyRows} metricLabel={unitLabel} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 10 }}>
              지역별 · {year}년 전체 · {unitLabel} 기준
            </div>
            <SpecialtyBars
              rows={regionSpecialtyRows}
              metricLabel={unitLabel}
              highlight={regionCode}
              onPick={(code) => setRegionCode(code === regionCode ? ALL : code)}
            />
          </div>
        </div>
      </Panel>
    </div>
  );
}
