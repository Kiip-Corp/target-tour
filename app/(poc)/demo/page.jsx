"use client";

import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  TrendingUp,
  Target,
  Sparkles,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  Plane,
  Search,
  CalendarDays,
  Coins,
} from "lucide-react";
import {
  CHANNELS,
  FUEL_TREND,
  NATION_DATA,
  NATIONS,
  REGIONS,
  fetchDemandMatrix,
  makeTrendSeries,
  recommend,
  visitorsFor,
} from "./data";
import { BORDER, CORAL, CSS, INK, MUTED, S, TEAL, heatColor } from "./styles";

/* ────────────────────────────────────────────────────────────────
   TargetTour — 국적별 관광 수요 기반 마케팅 자동화 (PoC)
   2026 관광데이터 활용 공모전 · 웹·앱 구현 부문 · 지정과제 8
   iipuda 의료·뷰티 관광 기준

   목업 데이터·API 연동 지점 → ./data.js
   팔레트·전역 CSS·인라인 스타일 → ./styles.js
   ──────────────────────────────────────────────────────────────── */

export default function TargetTour() {
  const data = useMemo(() => fetchDemandMatrix(), []);
  const [step, setStep] = useState(1);
  const [region, setRegion] = useState(REGIONS[0]);
  const [selectedChannels, setSelectedChannels] = useState(["xiaohongshu"]);
  const [generating, setGenerating] = useState(false);
  const [results, setResults] = useState(null);
  const [isSample, setIsSample] = useState(false);
  const [error, setError] = useState(null);

  const rec = useMemo(() => recommend(data, region), [data, region]);
  const trendSeries = useMemo(() => makeTrendSeries(data, region), [data, region]);
  const topNations = useMemo(
    () => [...NATIONS].sort((a, b) => data[region][b].demand - data[region][a].demand).slice(0, 3),
    [data, region]
  );
  const scatterData = useMemo(
    () =>
      NATIONS.map((n) => ({
        nation: n,
        x: visitorsFor(n, region),
        y: NATION_DATA[n].spend,
        z: data[region][n].medbeauty,
      })),
    [data, region]
  );
  const recData = NATION_DATA[rec.nation];
  const topKeyword = recData.keywords[0][0];

  const toggleChannel = (id) =>
    setSelectedChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );

  async function generate() {
    if (selectedChannels.length === 0) return;
    setGenerating(true);
    setError(null);
    setResults(null);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region,
          nation: rec.nation,
          agePeak: recData.agePeak,
          demand: rec.demand,
          trend: rec.trend,
          medbeauty: rec.medbeauty,
          spend: rec.spend,
          season: recData.season,
          flight: recData.flight,
          fx: recData.fx,
          keywords: recData.keywords,
          channels: selectedChannels,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "generation failed");
      setResults(payload.results);
      setIsSample(Boolean(payload.demo));
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : "콘텐츠 생성에 실패했어요. 다시 시도해 주세요."
      );
    } finally {
      setGenerating(false);
    }
  }

  const STEPS = [
    { n: "01", label: "수요 분석", icon: TrendingUp },
    { n: "02", label: "타깃 추천", icon: Target },
    { n: "03", label: "콘텐츠 생성", icon: Sparkles },
  ];

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      <header style={S.header}>
        <div>
          <div style={S.brandRow}>
            <span style={S.brandMark}>◆</span>
            <span style={S.brandName}>TargetTour</span>
            <span style={S.brandBadge}>PoC</span>
          </div>
          <p style={S.brandSub}>국적별 관광 수요 기반 마케팅 자동화 · 한국관광공사 OpenAPI 활용</p>
        </div>
        <div style={S.sourceTag}>
          데이터 · 수요강도/다양성 지수 · 방한 관광객/소비 · 검색 관심도 · 항공/환율
        </div>
      </header>

      <div style={S.body}>
        <nav style={S.rail}>
          {STEPS.map((s) => {
            const active = step === Number(s.n);
            const Icon = s.icon;
            return (
              <button
                key={s.n}
                onClick={() => setStep(Number(s.n))}
                style={{ ...S.railItem, ...(active ? S.railItemActive : {}) }}
              >
                <span style={{ ...S.railNum, color: active ? TEAL : "#C7C6BF" }}>{s.n}</span>
                <Icon size={16} color={active ? TEAL : MUTED} />
                <span style={{ color: active ? INK : MUTED, fontWeight: active ? 600 : 500 }}>
                  {s.label}
                </span>
              </button>
            );
          })}
        </nav>

        <main style={S.main}>
          <div style={S.contextBar}>
            <MapPin size={15} color={TEAL} />
            <span style={S.contextLabel}>분석 지역</span>
            <div style={S.regionChips}>
              {REGIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRegion(r);
                    setResults(null);
                  }}
                  style={{ ...S.chip, ...(region === r ? S.chipActive : {}) }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* STEP 1 — 수요 분석 */}
          {step === 1 && (
            <section>
              <SectionHead
                kicker="01 · 수요 분석"
                title="국적 × 지역 수요 히트 매트릭스"
                desc="관광 수요강도 지수를 국적별로 교차 분석합니다. 색이 진할수록 수요가 높습니다."
              />
              <div style={S.card}>
                <div style={S.matrixWrap}>
                  <table style={S.matrix}>
                    <thead>
                      <tr>
                        <th style={S.matrixCorner}></th>
                        {NATIONS.map((n) => (
                          <th key={n} style={S.matrixColHead}>{n}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {REGIONS.map((r) => (
                        <tr key={r}>
                          <td style={{ ...S.matrixRowHead, ...(r === region ? S.rowHeadActive : {}) }}>
                            {r}
                          </td>
                          {NATIONS.map((n) => {
                            const v = data[r][n].demand;
                            return (
                              <td
                                key={n}
                                style={{
                                  ...S.matrixCell,
                                  background: heatColor(v),
                                  color: v > 60 ? "#fff" : INK,
                                  outline: r === region ? `1px solid ${TEAL}55` : "none",
                                }}
                                title={`${r} · ${n} — 수요강도 ${v}`}
                              >
                                {v}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={S.legend}>
                  <span style={S.legendLabel}>낮음</span>
                  <div style={S.legendBar} />
                  <span style={S.legendLabel}>높음</span>
                  <span style={S.legendNote}>수요강도 0–100</span>
                </div>
              </div>

              {/* 시장 스냅샷 */}
              <SectionHead
                title={`${region} · 국가별 시장 스냅샷`}
                desc="시장 규모(방문자수)·성장률과 소비의 질(방문당 소비액)을 함께 봅니다. iipuda는 '적게 와도 많이 쓰는' 고가치 타깃이 핵심입니다."
                tight
              />
              <div style={S.card}>
                <div style={S.matrixWrap}>
                  <table style={S.snapTable}>
                    <thead>
                      <tr>
                        <th style={S.snapTh}>국가</th>
                        <th style={S.snapThNum}>월 방문자</th>
                        <th style={S.snapThNum}>전년비</th>
                        <th style={S.snapThNum}>방문당 소비</th>
                        <th style={S.snapThNum}>주력 연령</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...NATIONS]
                        .sort((a, b) => NATION_DATA[b].spend - NATION_DATA[a].spend)
                        .map((n) => {
                          const nd = NATION_DATA[n];
                          const isRec = n === rec.nation;
                          return (
                            <tr key={n} style={isRec ? S.snapRowRec : undefined}>
                              <td style={S.snapNation}>
                                {isRec && <span style={S.snapStar}>★</span>}
                                {n}
                              </td>
                              <td style={S.snapNum}>
                                {visitorsFor(n, region)}
                                <span style={S.snapUnit}>천</span>
                              </td>
                              <td style={{ ...S.snapNum, color: nd.yoy >= 0 ? TEAL : "#B4413A" }}>
                                {nd.yoy > 0 ? "+" : ""}
                                {nd.yoy}%
                              </td>
                              <td style={S.snapNum}>
                                {nd.spend}
                                <span style={S.snapUnit}>만원</span>
                              </td>
                              <td style={S.snapNum}>{nd.agePeak}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 사분면 : 방문량 × 소비액 */}
              <SectionHead
                title="시장 규모 × 소비의 질 사분면"
                desc="가로축 오른쪽일수록 큰 시장, 세로축 위쪽일수록 고소비. 우상단이 최우선 타깃, 좌상단은 '작지만 값진' 틈새 타깃입니다."
                tight
              />
              <div style={S.card}>
                <ResponsiveContainer width="100%" height={280}>
                  <ScatterChart margin={{ top: 12, right: 20, left: 4, bottom: 16 }}>
                    <CartesianGrid stroke="#EFEEE8" />
                    <XAxis
                      type="number" dataKey="x" name="월 방문자(천)"
                      tick={{ fontSize: 11, fill: MUTED }} axisLine={{ stroke: BORDER }} tickLine={false}
                      label={{ value: "시장 규모 · 월 방문자(천 명) →", position: "insideBottom", offset: -8, fontSize: 11, fill: MUTED }}
                    />
                    <YAxis
                      type="number" dataKey="y" name="방문당 소비(만원)"
                      tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false}
                      label={{ value: "소비의 질 →", angle: -90, position: "insideLeft", fontSize: 11, fill: MUTED }}
                    />
                    <ZAxis type="number" dataKey="z" range={[80, 400]} name="의료뷰티%" />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}` }}
                      formatter={(v, name) => [v, name]}
                    />
                    <Scatter
                      data={scatterData}
                      shape={(props) => {
                        const { cx, cy, payload } = props;
                        const isRec = payload.nation === rec.nation;
                        const r = 6 + payload.z / 8;
                        return (
                          <g>
                            <circle
                              cx={cx} cy={cy} r={r}
                              fill={isRec ? TEAL : CORAL}
                              fillOpacity={isRec ? 0.9 : 0.45}
                              stroke={isRec ? TEAL : "none"}
                              strokeWidth={isRec ? 2 : 0}
                            />
                            <text
                              x={cx} y={cy - r - 5} textAnchor="middle"
                              fontSize={11} fontWeight={isRec ? 700 : 500}
                              fill={isRec ? TEAL : INK}
                            >
                              {payload.nation}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </ScatterChart>
                </ResponsiveContainer>
                <p style={S.chartNote}>버블 크기 = 의료·뷰티 목적 비중</p>
              </div>

              {/* 추이 */}
              <SectionHead
                title={`${region} · 6개월 수요강도 추이`}
                desc="상위 3개 국적의 수요 흐름입니다. 상승 기울기가 캠페인 타이밍의 신호입니다."
                tight
              />
              <div style={S.card}>
                <ResponsiveContainer width="100%" height={230}>
                  <LineChart data={trendSeries} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="#EFEEE8" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: MUTED }} axisLine={{ stroke: BORDER }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${BORDER}` }} />
                    {topNations.map((n, i) => (
                      <Line key={n} type="monotone" dataKey={n} stroke={[TEAL, CORAL, "#8B7BB8"][i]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div style={S.stepFoot}>
                <button style={S.primaryBtn} onClick={() => setStep(2)}>
                  타깃 추천 보기 <ArrowUpRight size={16} />
                </button>
              </div>
            </section>
          )}

          {/* STEP 2 — 타깃 추천 */}
          {step === 2 && (
            <section>
              <SectionHead
                kicker="02 · 타깃 추천"
                title="이번 캠페인 최적 타깃"
                desc="수요강도(30%) · 성장률(20%) · 의료·뷰티 목적(25%) · 방문당 소비액(25%)을 종합해 산출했습니다."
              />
              <div style={S.verdict}>
                <div style={S.verdictMain}>
                  <span style={S.verdictKicker}>추천 타깃</span>
                  <div style={S.verdictTarget}>
                    <span>{region.split(" ")[1] || region}</span>
                    <span style={S.verdictX}>×</span>
                    <span>{rec.nation}</span>
                  </div>
                  <p style={S.verdictSeason}>
                    <strong>권장 시점</strong> · {recData.season}
                  </p>
                </div>
                <div style={S.verdictScore}>
                  <span style={S.scoreNum}>{rec.score}</span>
                  <span style={S.scoreLabel}>타깃 스코어</span>
                </div>
              </div>

              <div style={S.metricRow}>
                <Metric label="수요강도" value={rec.demand} unit="/100" />
                <Metric label="전년 대비" value={`${rec.yoy > 0 ? "+" : ""}${rec.yoy}`} unit="%" up={rec.yoy > 0} down={rec.yoy < 0} />
                <Metric label="의료·뷰티 목적" value={rec.medbeauty} unit="%" />
                <Metric label="방문당 소비" value={rec.spend} unit="만원" />
              </div>

              {/* 실행 타이밍 & 메시지 Hook */}
              <SectionHead
                title="실행 타이밍 & 메시지 Hook"
                desc="언제 집행할지, 무엇을 후크로 걸지 판단하는 신호입니다."
                tight
              />
              <div style={S.timingGrid}>
                <div style={S.timingCard}>
                  <div style={S.timingHead}>
                    <Search size={15} color={TEAL} />
                    <span>검색 관심도 급상승 · 의료·시술 TOP 3</span>
                  </div>
                  {recData.keywords.map(([kw, chg], i) => (
                    <div key={kw} style={S.kwRow}>
                      <span style={S.kwRank}>{i + 1}</span>
                      <span style={S.kwName}>{kw}</span>
                      <div style={S.kwBarTrack}>
                        <div style={{ ...S.kwBarFill, width: `${Math.min(100, chg * 2)}%` }} />
                      </div>
                      <span style={S.kwChg}>+{chg}%</span>
                    </div>
                  ))}
                  <p style={S.kwHookNote}>
                    → 최상위 <b>{topKeyword}</b> 을(를) 콘텐츠 후크로 자동 적용
                  </p>
                </div>

                <div style={S.timingCol}>
                  <div style={S.timingMini}>
                    <div style={S.timingHead}>
                      <CalendarDays size={15} color={TEAL} />
                      <span>시즌 캘린더</span>
                    </div>
                    <p style={S.miniText}>{recData.season}</p>
                  </div>
                  <div style={S.timingMini}>
                    <div style={S.timingHead}>
                      <Plane size={15} color={recData.flight.includes("없음") ? MUTED : TEAL} />
                      <span>항공 증편 이벤트</span>
                    </div>
                    <p style={{ ...S.miniText, color: recData.flight.includes("없음") ? MUTED : INK }}>
                      {recData.flight}
                    </p>
                  </div>
                  <div style={S.timingMini}>
                    <div style={S.timingHead}>
                      <Coins size={15} color={TEAL} />
                      <span>환율 · 유가 <span style={S.extBadge}>확장</span></span>
                    </div>
                    <p style={S.miniText}>{recData.fx}</p>
                    <p style={S.miniSub}>{FUEL_TREND}</p>
                  </div>
                </div>
              </div>

              <div style={S.rationale}>
                <span style={S.rationaleKicker}>소구점 정의 (Task 8 핵심 기능)</span>
                <p style={S.rationaleText}>
                  {region}의 {rec.nation} 관광객은 의료·뷰티 목적 비중 <b>{rec.medbeauty}%</b>,
                  방문당 소비 <b>{rec.spend}만원</b>의 고가치 세그먼트입니다.
                  {rec.yoy > 0 ? ` 전년 대비 ${rec.yoy}% 성장 중이고,` : " 성장은 완만하나,"}{" "}
                  {recData.flight.includes("없음") ? "" : `${recData.flight}으로 접근성이 개선됐습니다. `}
                  검색에서 <b>{topKeyword}</b> 관심이 급등해 이를 메시지 후크로 잡고,
                  신뢰(Verified by iipuda)·개인화 컨시어지를 전면에 세우는 것이 유효합니다.
                </p>
              </div>

              <div style={S.stepFoot}>
                <button style={S.ghostBtn} onClick={() => setStep(1)}>← 분석으로</button>
                <button style={S.primaryBtn} onClick={() => setStep(3)}>
                  이 타깃으로 콘텐츠 생성 <ArrowUpRight size={16} />
                </button>
              </div>
            </section>
          )}

          {/* STEP 3 — 콘텐츠 생성 */}
          {step === 3 && (
            <section>
              <SectionHead
                kicker="03 · 콘텐츠 생성"
                title="채널별 홍보 콘텐츠 자동 생성"
                desc={`타깃 ${region} × ${rec.nation} · 후크 "${topKeyword}" · 채널을 고르고 생성하면 현지어 카피가 만들어집니다.`}
              />

              <div style={S.channelGrid}>
                {CHANNELS.map((c) => {
                  const on = selectedChannels.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleChannel(c.id)} style={{ ...S.channelBtn, ...(on ? S.channelBtnOn : {}) }}>
                      <span style={S.channelLabel}>{c.label}</span>
                      <span style={S.channelNote}>{c.note}</span>
                      <span style={{ ...S.channelCheck, opacity: on ? 1 : 0 }}>✓</span>
                    </button>
                  );
                })}
              </div>

              <div style={S.stepFoot}>
                <button style={S.ghostBtn} onClick={() => setStep(2)}>← 추천으로</button>
                <button
                  style={{ ...S.primaryBtn, opacity: selectedChannels.length && !generating ? 1 : 0.5 }}
                  onClick={generate}
                  disabled={generating || selectedChannels.length === 0}
                >
                  {generating ? (<><Loader2 size={16} className="spin" /> 생성 중…</>) : (<><Sparkles size={16} /> 콘텐츠 생성</>)}
                </button>
              </div>

              {error && (
                <div style={S.errorBox}>
                  <AlertCircle size={16} color="#B4413A" /> {error}
                </div>
              )}

              {results && isSample && (
                <div style={S.sampleNote}>
                  API 키가 없거나 유효하지 않아 사전 작성된 <b>샘플 카피</b>를 보여주고 있습니다.
                  <code style={S.code}>.env.local</code>에 유효한{" "}
                  <code style={S.code}>ANTHROPIC_API_KEY</code>를 넣고 서버를 재시작하면
                  동일한 화면에서 타깃별 실시간 생성으로 전환됩니다.
                </div>
              )}

              {results && (
                <div style={S.resultsGrid}>
                  {results.map((r, i) => (
                    <div key={i} style={S.resultCard}>
                      <div style={S.resultHead}>
                        <span style={S.resultChannel}>{r.channel}</span>
                        <span style={S.resultLangGroup}>
                          {isSample && <span style={S.sampleBadge}>샘플</span>}
                          <span style={S.resultLang}>{r.lang}</span>
                        </span>
                      </div>
                      <h4 style={S.resultHeadline}>{r.headline}</h4>
                      <p style={S.resultBody}>{r.body}</p>
                      {r.hashtags && (
                        <div style={S.tags}>
                          {r.hashtags.map((t, j) => (<span key={j} style={S.tag}>{t}</span>))}
                        </div>
                      )}
                      <div style={S.resultCta}>{r.cta}</div>
                      {r.ko_gloss && <p style={S.resultGloss}>내부 검토 · {r.ko_gloss}</p>}
                    </div>
                  ))}
                </div>
              )}

              <div style={S.roadmap}>
                <span style={S.roadmapTag}>다음 단계 · 로드맵</span>
                <p style={S.roadmapText}>
                  ④ 캠페인 실행 → 채널별 유입·전환 성과 확인. 발송 후 UTM·상담 전환 데이터를
                  타깃 추천 로직에 되먹여 다음 캠페인 정확도를 높이는 폐루프 구조로 확장합니다.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function SectionHead({ kicker, title, desc, tight }) {
  return (
    <div style={{ marginTop: tight ? 30 : 6, marginBottom: 14 }}>
      {kicker && <div style={S.kicker}>{kicker}</div>}
      <h2 style={S.h2}>{title}</h2>
      {desc && <p style={S.desc}>{desc}</p>}
    </div>
  );
}

function Metric({ label, value, unit, up, down }) {
  return (
    <div style={S.metric}>
      <span style={S.metricLabel}>{label}</span>
      <span style={S.metricValue}>
        {value}
        <span style={S.metricUnit}>{unit}</span>
        {up && <ArrowUpRight size={15} color={TEAL} />}
        {down && <ArrowDownRight size={15} color="#B4413A" />}
      </span>
    </div>
  );
}