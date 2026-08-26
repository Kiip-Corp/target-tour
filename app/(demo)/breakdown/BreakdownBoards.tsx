"use client";

import { useMemo, useState } from "react";
import type { RegionSeries } from "../../_data/popularNeighborhoods";
import NeighborhoodBoard from "../popularNeighborhoods/NeighborhoodBoard";
import SpecialtyTreemap from "../specialtyTreemap/SpecialtyTreemap";
import type { SpecialtyData } from "../specialtyTreemap/categories";
import { buildPeriodOptions, toNeighborhoodAxis } from "../specialtyTreemap/periods";

const BORDER = "#E7E6E0";
const INK = "#171A21";
const MUTED = "#6B7280";

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

function Section({
  step,
  title,
  question,
  children,
}: {
  step: string;
  title: string;
  question: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
        background: "#fff",
        padding: 16,
        marginBottom: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 2 }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 18,
            height: 18,
            borderRadius: 5,
            background: INK,
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {step}
        </span>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: INK, margin: 0 }}>{title}</h2>
      </div>
      <p style={{ fontSize: 12, color: MUTED, margin: "0 0 12px 26px", lineHeight: 1.6 }}>{question}</p>
      {children}
    </section>
  );
}

function Takeaways({ items }: { items: React.ReactNode[] }) {
  return (
    <div
      style={{
        background: "#F4F8F6",
        border: "1px solid #D6E7E1",
        borderRadius: 10,
        padding: "12px 16px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "#0E7C6B",
          letterSpacing: "0.04em",
          marginBottom: 6,
        }}
      >
        시사점
      </div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, lineHeight: 1.7, color: "#25303B" }}>
        {items.map((t, i) => (
          <li key={i}>{t}</li>
        ))}
      </ul>
    </div>
  );
}

/**
 * 두 패널이 지역·기간을 함께 쓴다 — 예전에는 패널마다 같은 select가 따로 있어 두 번 골라야 했다.
 * 기간 옵션은 진료과목 쪽이 더 촘촘하므로(연도별·월별) 그쪽을 기준으로 두고,
 * 동네 패널은 그 값이 어느 시간축인지만 받아 쓰고 고른 시점은 순위표에서 강조한다.
 */
export default function BreakdownBoards({
  specialty,
  annual,
  monthly,
}: {
  specialty: SpecialtyData;
  annual: RegionSeries[];
  monthly: RegionSeries[];
}) {
  // 서울로 시작한다 — 전국은 동네 자료가 없어 패널 2가 비어 보인다.
  const [region, setRegion] = useState("서울");
  const [period, setPeriod] = useState("all");

  const periodOptions = useMemo(() => buildPeriodOptions(specialty, region), [specialty, region]);
  // 시도를 고르면 연도별·월별 옵션이 사라지므로 남아 있던 값을 보정한다.
  const effectivePeriod = periodOptions.some((o) => o.value === period) ? period : "all";
  const groups = [...new Set(periodOptions.map((o) => o.group))];

  const regionOptions = ["전국", ...specialty.regions.filter((r) => r.region !== "전국").map((r) => r.region)];
  const axis = toNeighborhoodAxis(effectivePeriod);

  return (
    <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 8,
          padding: 14,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          background: "#fff",
          marginBottom: 16,
        }}
      >
        <span style={{ fontSize: 11, color: MUTED }}>지역</span>
        <select aria-label="지역" value={region} onChange={(e) => setRegion(e.target.value)} style={selectStyle}>
          {regionOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>

        <span style={{ fontSize: 11, color: MUTED, marginLeft: 6 }}>기간</span>
        <select
          aria-label="기간"
          value={effectivePeriod}
          onChange={(e) => setPeriod(e.target.value)}
          style={selectStyle}
        >
          {groups.map((g) => (
            <optgroup key={g} label={g}>
              {periodOptions
                .filter((o) => o.group === g)
                .map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>

        <span style={{ fontSize: 10.5, color: "#9AA1A9", flexBasis: "100%" }}>
          아래 두 패널이 이 선택을 함께 따릅니다.{" "}
          {region === "전국"
            ? "전국은 진료과목만 있고 동네 자료는 없습니다 — 시도를 고르면 패널 2가 채워집니다."
            : "시도는 진료과목 누적 스냅샷 2종만 제공됩니다(연도별·월별은 전국만)."}
        </span>
      </div>

      <Section
        step="1"
        title="무엇을 — 진료과목 구성"
        question="소비액과 소비건수 중 어느 과목이 1위인가? 지역·기간을 바꾸면 어떻게 달라지나?"
      >
        <Takeaways
          items={[
            <>
              좌우 두 트리맵의 1위가 서로 다릅니다 — 소비액은 피부과(전체기간 43.8%)가, 소비건수는
              약국(55.2%)이 1위입니다. 돈은 피부과에서 쓰고 방문은 약국에서 하는 구조입니다.
            </>,
            <>
              성형외과를 클릭하면 금액 26.8% vs 건수 6.0%로 20.8%p 차이가 바로 보입니다 — 방문 빈도는
              낮지만 건당 단가가 압도적으로 높은 과목입니다.
            </>,
            <>
              지역을 바꾸면 성형외과 편중이 드러납니다 — 서울은 소비액의 29.0%가 성형외과인데 부산은
              8.3%로 3.5배 차이가 납니다.
            </>,
            <>
              기간을 전체기간 → 2025년으로 바꾸면 쏠림이 강해집니다 — 피부과 금액 비중이 43.8%에서
              54.5%로 10.7%p 올랐고, 대학/종합병원은 12.6%에서 7.1%로 줄었습니다.
            </>,
          ]}
        />
        <SpecialtyTreemap data={specialty} region={region} period={effectivePeriod} />
      </Section>

      <Section
        step="2"
        title="어느 동네에서 — 인기 소비동네"
        question="한 시도 안에서 소비가 몰리는 동네는 어디이고, 1위가 뒤집힌 적은 있나?"
      >
        <Takeaways
          items={[
            <>
              <b>[소비건수 · 서울]</b> 1위가 2024년에 교체됐습니다 — 2018~2023년 6년 연속 강남 역삼1동이
              1위였는데 2024년부터 중구 명동이 역전해 2026년 42.5%까지 격차를 벌렸습니다. 상단 “1위
              교체” 카드가 그 시점을 짚어줍니다.
            </>,
            <>
              <b>[소비건수 · 서울]</b> 강남 논현1동은 2018년 18.6%(3위)에서 2026년 7.0%(5위)로 계속
              밀려난 반면, 마포 서교동은 12.8%(5위)에서 23.7%(2위)로 올라섰습니다 — 선이 교차하는
              지점이 순위 역전 시점입니다.
            </>,
            <>
              <b>[소비액 · 서울]</b> 지표를 바꾸면 순위가 완전히 달라집니다 — 소비액 1위는 신사동(2018)
              → 서초4동(2024~2026)이고, 명동은 2018년 5위(7.9%)에서 2026년 2위(24.2%)로 올라섰습니다.
              “많이 방문하는 동네”와 “돈을 많이 쓰는 동네”가 일치하지 않습니다.
            </>,
          ]}
        />
        <NeighborhoodBoard annual={annual} monthly={monthly} region={region} period={axis} />
      </Section>
    </div>
  );
}
