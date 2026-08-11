"use client";

import * as d3 from "d3";
import { useMemo, useState } from "react";
import MultiLineChart from "../../_components/MultiLineChart";
import NeighborhoodRankingTable from "../../_components/NeighborhoodRankingTable";
import type { RegionSeries } from "../../_data/popularNeighborhoods";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";

type Period = "annual" | "monthly";
type Metric = "count" | "amount";

const METRIC_LABEL: Record<Metric, string> = { count: "소비건수", amount: "소비액" };

const fmt1 = d3.format(".1f");
const formatAnnual = (n: number) => `${n}년`;
const formatMonthly = (n: number) => {
  const s = String(n);
  return `${s.slice(2, 4)}.${s.slice(4, 6)}`;
};

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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div style={{ border: `1px solid ${BORDER}`, borderRadius: 10, padding: "11px 14px", background: "#fff", flex: "1 1 170px" }}>
      <div style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.06em", marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: INK, lineHeight: 1.25 }}>{value}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

export default function NeighborhoodBoard({
  annual,
  monthly,
}: {
  annual: RegionSeries[];
  monthly: RegionSeries[];
}) {
  const [period, setPeriod] = useState<Period>("annual");
  // 기본은 소비건수 — 서울 기준 "역삼1동 6년 1위 → 2024년 명동 역전"이라는 가장 뚜렷한
  // 순위 교체 서사가 이 지표에서 나온다(소비액은 1위가 더 자주 바뀌어 첫인상이 흐리다).
  const [metric, setMetric] = useState<Metric>("count");
  const [region, setRegion] = useState("서울");

  const data = period === "annual" ? annual : monthly;
  const formatPeriod = period === "annual" ? formatAnnual : formatMonthly;
  const current = data.find((d) => d.region === region) ?? data[0];
  const block = current?.[metric];

  // 첫 기간과 마지막 기간의 1위를 뽑아 "1위가 바뀌었는지"를 요약한다 —
  // 차트(추이)와 순위표(정확한 값) 사이를 이어주는 한 줄 결론.
  const summary = useMemo(() => {
    if (!block || block.years.length === 0) return null;
    const topAt = (idx: number) =>
      block.series
        .map((s) => ({ label: s.label, value: s.points[idx]?.value ?? 0 }))
        .sort((a, b) => b.value - a.value)[0];
    const lastIdx = block.years.length - 1;
    const first = topAt(0);
    const last = topAt(lastIdx);
    // 1위가 교체됐다면 그게 언제였는지(처음으로 현재 1위가 올라선 기간) 찾는다.
    let changedAt: number | null = null;
    if (first && last && first.label !== last.label) {
      for (let i = 0; i <= lastIdx; i++) {
        if (topAt(i)?.label === last.label) {
          changedAt = block.years[i];
          break;
        }
      }
    }
    return { first, last, firstPeriod: block.years[0], lastPeriod: block.years[lastIdx], changedAt };
  }, [block]);

  const regions = data.map((d) => d.region);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: 12,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          background: "#fff",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 11, color: MUTED }}>지역</span>
        <select
          aria-label="지역"
          value={region}
          onChange={(e) => setRegion(e.target.value)}
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
          {regions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>기간</span>
        <Toggle
          value={period}
          onChange={setPeriod}
          options={[
            { value: "annual", label: "연간 (2018–2026)" },
            { value: "monthly", label: "월간 (2025)" },
          ]}
        />

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>지표</span>
        <Toggle
          value={metric}
          onChange={setMetric}
          options={[
            { value: "amount", label: "소비액" },
            { value: "count", label: "소비건수" },
          ]}
        />
      </div>

      {summary && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
          <Stat
            label="최신 기간 1위"
            value={summary.last?.label ?? "-"}
            sub={`${formatPeriod(summary.lastPeriod)} · ${fmt1(summary.last?.value ?? 0)}%`}
          />
          <Stat
            label="첫 기간 1위"
            value={summary.first?.label ?? "-"}
            sub={`${formatPeriod(summary.firstPeriod)} · ${fmt1(summary.first?.value ?? 0)}%`}
          />
          <Stat
            label="1위 교체"
            value={summary.changedAt !== null ? `${formatPeriod(summary.changedAt)}부터` : "변동 없음"}
            sub={
              summary.changedAt !== null
                ? `${summary.first?.label} → ${summary.last?.label}`
                : `${summary.first?.label} 계속 1위`
            }
          />
          <Stat
            label="집계 대상"
            value={`${block?.series.length ?? 0}개 동네`}
            sub={`${region} · ${METRIC_LABEL[metric]} 상위`}
          />
        </div>
      )}

      {block && (
        <>
          <section
            style={{
              border: `1px solid ${BORDER}`,
              borderRadius: 12,
              padding: 16,
              marginBottom: 14,
              background: "#FBFBF8",
            }}
          >
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 2 }}>
              추이 — {region} · {METRIC_LABEL[metric]} 비율 상위 동네
            </div>
            <div style={{ fontSize: 10.5, color: "#9AA1A9", marginBottom: 10 }}>
              선이 교차하는 지점이 순위가 뒤바뀐 시점입니다. 정확한 값은 아래 순위표에서 확인하세요.
            </div>
            <MultiLineChart
              key={`${region}-${period}-${metric}`}
              series={block.series}
              years={block.years}
              defaultVisible={block.series.map((s) => s.label)}
              groupLabel="동네"
              valueLabel={`${METRIC_LABEL[metric]} 비율 (%)`}
              formatPeriod={formatPeriod}
              formatValue={(n) => `${fmt1(n)}%`}
              axisLabel={period === "annual" ? "기준연도" : "기준연월(2025년)"}
            />
          </section>

          <section style={{ border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16, background: "#FBFBF8" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: INK, marginBottom: 2 }}>
              순위표 — {region} · {METRIC_LABEL[metric]} 비율
            </div>
            <div style={{ fontSize: 10.5, color: "#9AA1A9", marginBottom: 10 }}>
              매 기간의 1~5위를 hover 없이 한 번에 볼 수 있습니다 — “어느 동네가 언제 1위였는지”에 적합합니다.
            </div>
            <NeighborhoodRankingTable series={block.series} years={block.years} formatPeriod={formatPeriod} />
          </section>
        </>
      )}
    </div>
  );
}
