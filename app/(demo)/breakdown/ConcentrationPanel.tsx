"use client";

import { useEffect, useMemo, useState } from "react";
import { KoreaBubbleMap, type KoreaMapData, type TooltipProps } from "../../_koreaBubbleMap/KoreaBubbleMap";
import { SIDO_CODES } from "../../_koreaBubbleMap/sidoCodes";
import {
  INDICATOR_META,
  LAST_YM,
  availableMonths,
  formatYm,
} from "../../../lib/kto/coverage";

const BORDER = "#E7E6E0";
const INK = "#171A21";
const MUTED = "#6B7280";

/**
 * dataviz 스킬의 순차형(sequential) 단일 색상 램프 — blue 100~700을 7단계로.
 * 이 화면이 담는 건 "많다/적다"라는 연속 크기라 choropleth의 기본형인 순차형을 쓴다.
 * 기준선 100을 가운데 두는 발산형(diverging)은 쓸 수 없다 — 국적 다양성(3303)은 실측
 * 전 구간이 100 미만이라 발산형으로 칠하면 전국이 한 색으로 뭉개진다.
 */
const RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];
const NO_DATA = "#EFEFEC";

/** 지도 높이에 맞춰 세우는 시군구 수. 경기는 48개라 그대로 세우면 순위표가 지도보다 길어진다. */
const TOP_N = 12;


type SigunguValue = { name: string; code: string; mapCode: string; value: number };
type RegionConcentration = {
  full: string;
  short: string;
  mapCode: string;
  areaCd: string;
  value: number | null;
  sigungu: SigunguValue[];
};
type Result = {
  baseYm: string;
  ix: string;
  regions: RegionConcentration[];
  missing: string[];
};

const selectStyle = {
  border: `1px solid ${BORDER}`,
  borderRadius: 6,
  padding: "5px 8px",
  fontFamily: "ui-monospace, monospace",
  fontSize: 12,
  color: INK,
  background: "#fff",
  cursor: "pointer",
} as const;

/** 값 분포가 한쪽으로 심하게 쏠려 있어(3302는 69~688) 등간격 구간은 대부분을 같은 색으로
 *  뭉갠다. 분위수로 잘라 7단계를 고르게 쓰고, 각 구간의 실제 값 범위를 범례에 적는다. */
function quantileScale(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  if (sorted.length === 0) return { color: () => NO_DATA, bins: [] as { from: number; to: number; fill: string }[] };

  const cuts = RAMP.slice(1).map((_, i) => {
    const pos = ((i + 1) / RAMP.length) * (sorted.length - 1);
    const lo = Math.floor(pos);
    const hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  });

  const color = (v: number) => {
    let i = 0;
    while (i < cuts.length && v >= cuts[i]) i++;
    return RAMP[i];
  };

  const edges = [sorted[0], ...cuts, sorted[sorted.length - 1]];
  const bins = RAMP.map((fill, i) => ({ from: edges[i], to: edges[i + 1], fill })).filter(
    (b) => b.to > b.from || b.from === sorted[0]
  );

  return { color, bins };
}

const fmt = (n: number) => n.toFixed(1);

function Legend({
  bins,
  note,
}: {
  bins: { from: number; to: number; fill: string }[];
  note: string;
}) {
  if (bins.length === 0) return null;
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 2 }}>
        {bins.map((b, i) => (
          <div key={i} style={{ flex: 1, minWidth: 0 }}>
            <div style={{ height: 10, background: b.fill, borderRadius: i === 0 ? "4px 0 0 4px" : i === bins.length - 1 ? "0 4px 4px 0" : 0 }} />
            <div style={{ fontSize: 9.5, color: MUTED, marginTop: 3, textAlign: "center" }}>
              {fmt(b.from)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4, lineHeight: 1.6 }}>{note}</div>
    </div>
  );
}

function RankBars({
  rows,
  color,
  emphasis,
  emptyNote,
}: {
  rows: SigunguValue[];
  color: (v: number) => string;
  emphasis: number;
  emptyNote: string;
}) {
  if (rows.length === 0) {
    return <div style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.7 }}>{emptyNote}</div>;
  }
  const max = rows[0].value;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {rows.map((r) => (
        <div key={r.code} style={{ display: "grid", gridTemplateColumns: "84px 1fr 52px", gap: 8, alignItems: "center" }}>
          <div style={{ fontSize: 11, color: INK, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={r.name}>
            {r.name}
          </div>
          <div style={{ position: "relative", height: 14, background: "#F6F6F3", borderRadius: 4 }}>
            <div
              style={{
                width: `${Math.max(2, (r.value / max) * 100)}%`,
                height: "100%",
                background: color(r.value),
                borderRadius: 4,
              }}
            />
            {/* 기준선 100 — 이 값보다 왼쪽이면 전국 평균 이하다. */}
            {emphasis <= max && (
              <div
                style={{
                  position: "absolute",
                  left: `${(emphasis / max) * 100}%`,
                  top: -2,
                  bottom: -2,
                  width: 1,
                  background: "#C3C2B7",
                }}
              />
            )}
          </div>
          <div style={{ fontSize: 11, color: INK, textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
            {fmt(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ③ 탭 패널 3 — 시군구 단위 외국인 집중도.
 *
 * 앞의 두 패널이 읽는 데이터랩 CSV는 시도 17개까지만 내려간다. 이 패널만 요청 시점에
 * 관광공사 TourAPI(data.go.kr)를 실제로 호출해 그 아래 시군구 층을 채운다.
 * 값은 전부 지수(기준선 100)라 규모가 아니라 «집중도»이고, 지역끼리 더할 수 없다.
 */
export default function ConcentrationPanel({ region }: { region: string }) {
  const [ix, setIx] = useState<string>("3302");
  const [ym, setYm] = useState<string>(LAST_YM);
  /**
   * 응답을 요청 키와 함께 담는다 — 로딩 여부를 따로 저장하지 않고 "받아 둔 키가 지금 키와
   * 다른가"로 파생시키기 위해서다. effect 본문에서 동기적으로 setState 하지 않게 되고,
   * 늦게 도착한 이전 요청이 최신 화면을 덮어쓰는 경합도 같은 장치로 막힌다.
   */
  const [res, setRes] = useState<{ key: string; data: Result | null; error: string | null }>({
    key: "",
    data: null,
    error: null,
  });

  const key = `${ym}|${ix}`;
  const { data, error } = res.key === key ? res : { data: null, error: null };
  const loading = res.key !== key;

  const months = useMemo(() => availableMonths(), []);

  useEffect(() => {
    const ac = new AbortController();
    fetch(`/api/kto/concentration?ym=${ym}&ix=${ix}`, { signal: ac.signal })
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok) throw new Error(json.error ?? "불러오지 못했습니다.");
        return json as Result;
      })
      .then((d) => setRes({ key: `${ym}|${ix}`, data: d, error: null }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setRes({ key: `${ym}|${ix}`, data: null, error: e instanceof Error ? e.message : String(e) });
      });
    return () => ac.abort();
  }, [ym, ix]);

  const meta = INDICATOR_META.find((i) => i.key === ix)!;

  // 지도(시도)와 순위표(시군구)는 서로 다른 모집단이라 색 스케일을 따로 만든다 —
  // 하나로 묶으면 시군구 값이 시도 총계보다 훨씬 넓게 퍼져 지도가 거의 한 색이 된다.
  const sidoScale = useMemo(
    () => quantileScale((data?.regions ?? []).map((r) => r.value).filter((v): v is number => v !== null)),
    [data]
  );

  const picked = useMemo(() => {
    if (!data) return null;
    return data.regions.find((r) => r.short === region) ?? null;
  }, [data, region]);

  const allSigungu = useMemo(() => {
    if (!data) return [];
    return picked
      ? picked.sigungu
      : data.regions.flatMap((r) => r.sigungu).sort((a, b) => b.value - a.value);
  }, [data, picked]);
  const sigunguRows = useMemo(() => allSigungu.slice(0, TOP_N), [allSigungu]);

  const sigunguScale = useMemo(() => quantileScale(allSigungu.map((r) => r.value)), [allSigungu]);

  /** 지도의 서울 드릴다운은 언제나 «서울 25개 구» 안에서 칠한다 — 오른쪽 순위표가 어느 시도를
   *  보고 있든 상관없어야 한다. sigunguScale을 그대로 쓰면 부산을 고른 채 서울로 확대했을 때
   *  부산 기준으로 칠해진다. */
  const seoulScale = useMemo(() => {
    const seoul = (data?.regions ?? []).find((r) => r.short === "서울");
    return quantileScale((seoul?.sigungu ?? []).map((g) => g.value));
  }, [data]);

  const mapData: KoreaMapData = useMemo(() => {
    const byShort = new Map((data?.regions ?? []).map((r) => [r.short, r]));
    const seoul = byShort.get("서울");
    return {
      sido: SIDO_CODES.map((s) => {
        const r = byShort.get(s.short);
        return {
          code: s.code,
          name: s.short,
          count: r?.value ?? 0,
          fill: r?.value != null ? sidoScale.color(r.value) : NO_DATA,
        };
      }),
      sigungu: seoul?.sigungu.map((g) => ({
        code: g.mapCode,
        name: g.name,
        count: g.value,
        fill: seoulScale.color(g.value),
      })),
    };
  }, [data, sidoScale, seoulScale]);

  const scopeLabel = picked ? picked.full : `전국 시군구 상위 ${TOP_N}곳`;

  return (
    <div>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span style={{ fontSize: 11, color: MUTED }}>지표</span>
        <select aria-label="지표" value={ix} onChange={(e) => setIx(e.target.value)} style={selectStyle}>
          {INDICATOR_META.map((i) => (
            <option key={i.key} value={i.key}>
              {i.label}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>기준월</span>
        <select aria-label="기준월" value={ym} onChange={(e) => setYm(e.target.value)} style={selectStyle}>
          {months.map((m) => (
            <option key={m} value={m}>
              {formatYm(m)}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 10.5, color: "#9AA1A9" }}>
          {meta.hint} · {loading ? "관광공사 API 호출 중…" : "data.go.kr 실시간 호출"}
        </span>
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #F0C9C9",
            background: "#FDF4F4",
            borderRadius: 8,
            padding: "10px 14px",
            fontSize: 11.5,
            color: "#8A3A3A",
            lineHeight: 1.7,
          }}
        >
          관광공사 API를 불러오지 못했습니다 — {error}
          <br />
          지표나 기준월을 바꾸면 다시 호출합니다.
        </div>
      )}

      {!error && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 420px) minmax(300px, 1fr)", gap: 20, alignItems: "start" }}>
          <div style={{ opacity: loading ? 0.45 : 1, transition: "opacity 120ms" }}>
            <KoreaBubbleMap
              key={`conc-${ym}-${ix}`}
              data={mapData}
              width={380}
              height={440}
              showBubbles={false}
              countLabel="집중도 지수"
              customTooltip={({ name, count }: TooltipProps) => (
                <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12.5 }}>
                  <strong style={{ display: "block", marginBottom: 6, color: INK }}>{name}</strong>
                  <div style={{ color: MUTED }}>
                    {meta.label} <b style={{ color: INK }}>{count > 0 ? fmt(count) : "자료 없음"}</b>
                  </div>
                  {count > 0 && (
                    <div style={{ color: MUTED, marginTop: 2 }}>
                      전국 평균(100) 대비 <b style={{ color: INK }}>{count >= 100 ? "+" : ""}{fmt(count - 100)}</b>
                    </div>
                  )}
                </div>
              )}
            />
            <Legend
              bins={sidoScale.bins}
              note="시도 총계 기준이고, 구간은 분위수로 잘라 각 구간에 같은 수의 시도가 들어갑니다. 서울을 확대하면 25개 구가 나오는데, 그때는 서울 안에서 다시 칠하므로 색이 위 범례와 다른 기준입니다."
            />
          </div>

          <div style={{ opacity: loading ? 0.45 : 1, transition: "opacity 120ms" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: INK, marginBottom: 8 }}>
              {scopeLabel} · {meta.label}
            </div>
            <RankBars
              rows={sigunguRows}
              color={sigunguScale.color}
              emphasis={100}
              emptyNote={
                loading
                  ? "관광공사 API에서 불러오는 중입니다…"
                  : picked && picked.value !== null
                    ? `${picked.full}는 이 달 시도 총계(${fmt(picked.value)})만 제공되고 시군구 내역이 없습니다 — 2026.07 시도 개편(전남광주통합특별시 출범)의 영향입니다.`
                    : "이 달은 시군구 자료가 없습니다."
              }
            />
            <div style={{ fontSize: 10.5, color: MUTED, marginTop: 8, lineHeight: 1.6 }}>
              막대 안 세로선이 전국 평균(100)입니다 — 선을 넘은 시군구가 &ldquo;유독 몰린 곳&rdquo;입니다.
              {allSigungu.length > sigunguRows.length &&
                ` 상위 ${sigunguRows.length}곳만 표시했습니다(전체 ${allSigungu.length}곳).`}
            </div>
          </div>
        </div>
      )}

      {data && data.missing.length > 0 && (
        <div style={{ fontSize: 10.5, color: MUTED, marginTop: 10, lineHeight: 1.6 }}>
          ※ {formatYm(data.baseYm)} 기준 자료가 없는 시도 {data.missing.length}곳은
          회색으로 비워 뒀습니다 — {data.missing.join(" · ")}.
        </div>
      )}
    </div>
  );
}
