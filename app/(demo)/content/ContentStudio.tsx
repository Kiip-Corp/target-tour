"use client";

import { useMemo, useState } from "react";
import { CHANNELS, type Copy, type Fact, type GenerateBody } from "../../_promoCopy/channels";
import type { ContentFacts, Specialty, SpecialtyTrend } from "./targetFacts";

const INK = "#171A21";
const MUTED = "#6B7280";
const BORDER = "#E7E6E0";
const SURFACE = "#FBFBF8";
const ACCENT = "#1baf7a";

/** 원자료가 천원 단위라 억/조로 접어야 카드에 들어간다(①②③ 탭과 같은 규칙). */
function fmtSpend(thousandWon: number) {
  const won = thousandWon * 1000;
  if (won >= 1e12) return `${(won / 1e12).toFixed(1)}조원`;
  if (won >= 1e8) return `${Math.round(won / 1e8).toLocaleString()}억원`;
  if (won >= 1e4) return `${Math.round(won / 1e4).toLocaleString()}만원`;
  return `${Math.round(won).toLocaleString()}원`;
}

const fmtPeople = (n: number) => `${Math.round(n).toLocaleString()}명`;
const fmtPct = (n: number) => n.toFixed(1);
const signed = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
const specialtyLine = (rows: Specialty[]) =>
  rows.length === 0 ? "자료 없음" : rows.map((s) => `${s.name} ${fmtPct(s.share)}%`).join(" · ");

const risingLine = (rows: SpecialtyTrend[]) =>
  rows.length === 0
    ? "전년 비교 자료 없음"
    : rows.map((s) => `${s.name} ${fmtPct(s.share)}% (전년 대비 +${fmtPct(s.delta)}%p)`).join(" · ");

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
    <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: MUTED }}>{label}</span>
      <select
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
    </label>
  );
}

function Panel({
  step,
  title,
  question,
  note,
  children,
}: {
  step: string;
  title: string;
  question: string;
  note: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        padding: 18,
        marginBottom: 18,
        background: SURFACE,
      }}
    >
      <div style={{ marginBottom: 12 }}>
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
      {children}
    </section>
  );
}

function Card({
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
    <div
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "12px 14px",
        background: "#fff",
        flex: "1 1 180px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 8, background: color, display: "block" }} />
        <span style={{ fontSize: 10.5, color: MUTED, letterSpacing: "0.06em" }}>{title}</span>
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: INK, lineHeight: 1.25 }}>{headline}</div>
      <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{sub}</div>
    </div>
  );
}

export default function ContentStudio({ facts }: { facts: ContentFacts }) {
  const [year, setYear] = useState(facts.defaultYear);
  const [regionCode, setRegionCode] = useState(facts.regions[0]?.code ?? "");
  const [country, setCountry] = useState(facts.countries[0]?.label ?? "");
  const [channels, setChannels] = useState<string[]>(["xiaohongshu"]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState<Copy[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const region = facts.regions.find((r) => r.code === regionCode) ?? facts.regions[0];
  const tone = facts.countries.find((c) => c.label === country)?.color ?? ACCENT;
  const tourFacts = facts.tour[year]?.[regionCode]?.[country] ?? null;
  const countryMed = facts.countryMedical[year]?.[country] ?? null;
  const regionMed = facts.regionMedical[year]?.[regionCode] ?? null;
  const topSpecialty = countryMed?.topSpecialties[0]?.name;
  // 후크는 "전년 대비 가장 오른 과목" — 없으면(시계열 첫 해) 소비액 1위 과목으로 떨어진다.
  const risingSpecialty = countryMed?.risingSpecialties[0]?.name;
  const hook = risingSpecialty ?? topSpecialty;

  /**
   * 카피 생성에 넘길 근거. 지표의 뜻이 라벨에 다 들어 있어야 한다 — 방문·관광소비는 추정치,
   * 의료소비는 원자료, 지역 의료소비는 국가 구분이 없는 전체 외국인 합계라 셋의 성격이 다르다.
   */
  const targetFactList = useMemo<Fact[]>(() => {
    const out: Fact[] = [];
    if (tourFacts) {
      out.push({
        label: `${year}년 ${region.full} 추정 방문자 수`,
        value: `${fmtPeople(tourFacts.visitors)} — 그 시도 외국인 방문자의 ${fmtPct(
          tourFacts.visitShare
        )}%, 이 국적 기준 17개 시도 중 ${tourFacts.regionRank}위 (추정치)`,
      });
      out.push({
        label: "방문 1회당 관광소비액",
        value: `${Math.round(tourFacts.spendPerVisit).toLocaleString()}만원 (추정치)`,
      });
      if (tourFacts.yoy !== null)
        out.push({ label: "전년 같은 기간 대비 방문자 증감", value: signed(tourFacts.yoy) });
      if (tourFacts.peakMonth)
        out.push({ label: "방문이 가장 몰리는 달", value: `${tourFacts.peakMonth}월` });
    }
    if (countryMed) {
      out.push({
        label: `${country} 국적의 전국 의료소비액 (원자료, 지역 구분 없음)`,
        value: `${fmtSpend(countryMed.amount)} — 전체 외국인 의료소비의 ${fmtPct(
          countryMed.amountShare
        )}%`,
      });
      out.push({
        label: `${country} 국적의 소비액 상위 진료과목`,
        value: specialtyLine(countryMed.topSpecialties),
      });
      if (countryMed.risingSpecialties.length > 0)
        out.push({
          label: `${country} 국적에서 전년 대비 비중이 오른 진료과목`,
          value: risingLine(countryMed.risingSpecialties),
        });
      if (countryMed.peakMonth)
        out.push({ label: "의료소비가 가장 몰리는 달", value: `${countryMed.peakMonth}월` });
    }
    if (regionMed) {
      out.push({
        label: `${region.full}의 소비액 상위 진료과목 (전체 외국인, 국적 구분 없음)`,
        value: specialtyLine(regionMed.topSpecialties),
      });
      if (regionMed.risingSpecialties.length > 0)
        out.push({
          label: `${region.full}에서 전년 대비 비중이 오른 진료과목 (전체 외국인)`,
          value: risingLine(regionMed.risingSpecialties),
        });
    }
    return out;
  }, [country, countryMed, region, regionMed, tourFacts, year]);

  const body: GenerateBody = useMemo(
    () => ({
      region: region.full,
      nation: country,
      channels,
      facts: targetFactList,
      topSpecialty,
      risingSpecialty,
    }),
    [channels, country, region, risingSpecialty, targetFactList, topSpecialty]
  );

  const toggle = (id: string) =>
    setChannels((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const reset = () => {
    setResults(null);
    setError(null);
  };

  async function generate() {
    if (channels.length === 0) return;
    setGenerating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as { results?: Copy[]; error?: string };
      if (!response.ok || !payload.results) {
        throw new Error(payload.error || "콘텐츠 생성에 실패했어요.");
      }
      setResults(payload.results);
    } catch (e) {
      setError(
        e instanceof Error && e.message ? e.message : "콘텐츠 생성에 실패했어요. 다시 시도해 주세요."
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <>
      <Panel
        step="패널 1"
        title="타깃 고르기 — 어느 시도의 어느 국적에 쓸 것인가"
        question="①②③ 탭과 같은 데이터랩 자료에서 이 타깃의 근거를 뽑아 옵니다."
        note="방문·관광소비는 전체 외국인 값 × 국가 비율(%)로 만든 추정치, 의료소비는 원자료입니다."
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          <Select
            label="방문지"
            value={regionCode}
            onChange={(v) => {
              setRegionCode(v);
              reset();
            }}
            options={facts.regions.map((r) => ({ value: r.code, label: r.full }))}
          />
          <Select
            label="국적"
            value={country}
            onChange={(v) => {
              setCountry(v);
              reset();
            }}
            options={facts.countries.map((c) => ({ value: c.label, label: c.label }))}
          />
          <Select
            label="기준연도"
            value={String(year)}
            onChange={(v) => {
              setYear(Number(v));
              reset();
            }}
            options={facts.years.map((y) => ({
              value: String(y),
              label: `${y}년${(facts.monthsByYear[y]?.length ?? 12) < 12 ? " (일부 월)" : ""}`,
            }))}
          />
        </div>

        {tourFacts || countryMed ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
            <Card
              title="추정 방문자 수"
              headline={tourFacts ? fmtPeople(tourFacts.visitors) : "자료 없음"}
              sub={
                tourFacts
                  ? `${region.short} 외국인의 ${fmtPct(tourFacts.visitShare)}% · 17개 시도 중 ${
                      tourFacts.regionRank
                    }위`
                  : "이 연도·지역 자료가 없습니다"
              }
              color={tone}
            />
            <Card
              title="방문 1회당 관광소비"
              headline={
                tourFacts ? `${Math.round(tourFacts.spendPerVisit).toLocaleString()}만원` : "—"
              }
              sub={
                tourFacts?.yoy !== null && tourFacts
                  ? `방문자 전년 대비 ${signed(tourFacts.yoy!)}`
                  : "전년 비교 자료 없음"
              }
              color={tone}
            />
            <Card
              title={`${country} 전국 의료소비`}
              headline={countryMed ? fmtSpend(countryMed.amount) : "—"}
              sub={
                countryMed
                  ? `전체 외국인 의료소비의 ${fmtPct(countryMed.amountShare)}% · 1위 ${
                      countryMed.topSpecialties[0]?.name ?? "—"
                    }`
                  : "자료 없음"
              }
              color={tone}
            />
            <Card
              title="성수기"
              headline={tourFacts?.peakMonth ? `방문 ${tourFacts.peakMonth}월` : "—"}
              sub={
                countryMed?.peakMonth
                  ? `의료소비는 ${countryMed.peakMonth}월에 가장 몰림`
                  : "의료소비 자료 없음"
              }
              color={tone}
            />
          </div>
        ) : (
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 12 }}>
            {year}년 {region.full} · {country} 자료가 없습니다. 다른 연도나 지역을 골라 주세요.
          </div>
        )}

        <details
          style={{
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            background: "#fff",
            padding: "10px 14px",
            fontSize: 11.5,
            lineHeight: 1.8,
            color: MUTED,
          }}
        >
          <summary style={{ cursor: "pointer", color: INK, fontWeight: 700, fontSize: 11.5 }}>
            카피 생성에 넘기는 실측 근거 {targetFactList.length}줄 (펼쳐 보기)
          </summary>
          <div style={{ marginTop: 8, display: "grid", gap: 4 }}>
            {targetFactList.map((f) => (
              <div key={f.label}>
                <span style={{ color: INK }}>{f.label}</span> · {f.value}
              </div>
            ))}
          </div>
        </details>

        <div
          style={{
            background: "#fff",
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid ${ACCENT}`,
            borderRadius: 10,
            padding: "12px 16px",
            marginTop: 12,
            fontSize: 11.5,
            lineHeight: 1.85,
            color: MUTED,
          }}
        >
          <b style={{ display: "block", marginBottom: 4, fontSize: 11, color: INK }}>
            이 카피가 걸 후크 — 소비가 옮겨가는 중인 진료과목
          </b>
          {country} 국적 · <b style={{ color: INK }}>{risingLine(countryMed?.risingSpecialties ?? [])}</b>
          <br />
          {region.short} 전체 외국인 · <b style={{ color: INK }}>{risingLine(regionMed?.risingSpecialties ?? [])}</b>
          <br />
          진료과목 자료는 절대액이 아니라 <b>구성비(%)</b>뿐이라, 비중이 올랐다는 건 그 해에 돈이
          그쪽으로 옮겨갔다는 뜻입니다 — 이 자료로 잡을 수 있는 유일한 모멘텀이라 후크로 씁니다.
          전년 자료가 없는 해는 소비액 1위 과목이 후크가 됩니다.
        </div>
      </Panel>

      <Panel
        step="패널 2"
        title="채널별 홍보 콘텐츠 자동 생성"
        question={`${region.full} × ${country} · 후크 "${hook ?? "—"}" · 소구 과목 "${
          topSpecialty ?? "—"
        }"`}
        note="고른 채널마다 그 채널 관행과 독자의 현지어로 카피 한 벌씩 만듭니다."
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {CHANNELS.map((c) => {
            const on = channels.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggle(c.id)}
                aria-pressed={on}
                style={{
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  gap: 3,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${on ? INK : BORDER}`,
                  background: on ? INK : "#fff",
                  color: on ? "#fff" : INK,
                  cursor: "pointer",
                  fontFamily: "ui-monospace, monospace",
                  textAlign: "left",
                }}
              >
                <span style={{ fontSize: 12.5, fontWeight: 700 }}>{c.label}</span>
                <span style={{ fontSize: 10.5, color: on ? "rgba(255,255,255,0.75)" : MUTED }}>
                  {c.note}
                </span>
                <span style={{ position: "absolute", top: 8, right: 10, fontSize: 12, opacity: on ? 1 : 0 }}>
                  ✓
                </span>
              </button>
            );
          })}
        </div>

        <button
          onClick={generate}
          disabled={generating || channels.length === 0}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: INK,
            color: "#fff",
            fontFamily: "ui-monospace, monospace",
            fontSize: 12.5,
            fontWeight: 700,
            cursor: generating || channels.length === 0 ? "default" : "pointer",
            opacity: generating || channels.length === 0 ? 0.5 : 1,
          }}
        >
          {generating ? "생성 중…" : `✨ 콘텐츠 생성 (${channels.length}개 채널)`}
        </button>

        {error && (
          <div
            style={{
              marginTop: 12,
              border: "1px solid #E7C4C1",
              background: "#FDF3F2",
              color: "#B4413A",
              borderRadius: 10,
              padding: "10px 14px",
              fontSize: 11.5,
            }}
          >
            {error}
          </div>
        )}

        {results && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {results.map((r, i) => (
              <div
                key={`${r.channel}-${i}`}
                style={{
                  border: `1px solid ${BORDER}`,
                  borderRadius: 12,
                  background: "#fff",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK }}>{r.channel}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 10.5, color: MUTED }}>{r.lang}</span>
                  </span>
                </div>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0, lineHeight: 1.45 }}>
                  {r.headline}
                </h4>
                <p style={{ fontSize: 12, color: "#3A424D", margin: 0, lineHeight: 1.75 }}>{r.body}</p>
                {r.hashtags?.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {r.hashtags.map((t, j) => (
                      <span
                        key={`${t}-${j}`}
                        style={{
                          fontSize: 10.5,
                          color: MUTED,
                          background: SURFACE,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 999,
                          padding: "2px 8px",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div
                  style={{
                    fontSize: 11.5,
                    fontWeight: 700,
                    color: ACCENT,
                    borderTop: `1px solid ${BORDER}`,
                    paddingTop: 8,
                  }}
                >
                  {r.cta}
                </div>
                {r.ko_gloss && (
                  <p style={{ fontSize: 10.5, color: "#9AA1A9", margin: 0, lineHeight: 1.6 }}>
                    내부 검토 · {r.ko_gloss}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
