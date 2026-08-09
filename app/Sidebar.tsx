"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_SECTIONS = [
  {
    title: "PoC",
    items: [
      { href: "/demo", label: "demo", desc: "국적별 수요 기반 마케팅" },
      { href: "/visitor", label: "visitor", desc: "외국인 밀집 지역 스캐너" },
    ],
  },
  {
    title: "PoC2",
    items: [
      {
        href: "/medicalTourismInterest",
        label: "medicalTourismInterest",
        desc: "의료관광 관심도 추이",
      },
      {
        href: "/foreignPatientsByCountry",
        label: "foreignPatientsByCountry",
        desc: "국가별 외국인 환자 현황",
      },
      {
        href: "/foreignPatientsByRegion",
        label: "foreignPatientsByRegion",
        desc: "지역별 외국인 환자 현황",
      },
      {
        href: "/medicalConsumptionTrend",
        label: "medicalConsumptionTrend",
        desc: "의료 소비 건수·금액 추이",
      },
      {
        href: "/medicalConsumptionByCountry",
        label: "medicalConsumptionByCountry",
        desc: "국가별 의료 소비액 추이",
      },
      {
        href: "/medicalSpecialtyMix",
        label: "medicalSpecialtyMix",
        desc: "진료과목별 소비 비율",
      },
      {
        href: "/medicalSpecialtyOverall",
        label: "medicalSpecialtyOverall",
        desc: "진료과목별 소비 비율(종합)",
      },
      {
        href: "/medicalConsumptionMap",
        label: "medicalConsumptionMap",
        desc: "지역별 소비 지도 (5-1)",
      },
      {
        href: "/tourismConsumptionMap",
        label: "tourismConsumptionMap",
        desc: "전국→서울→강남구 드릴다운 지도 (6)",
      },
      {
        href: "/foreignVisitorRegionMap",
        label: "foreignVisitorRegionMap",
        desc: "국가별 방한객 지역 분포 지도 (7)",
      },
      {
        href: "/medicalSpecialtyByRegion",
        label: "medicalSpecialtyByRegion",
        desc: "지역별 진료과목 비율 (5-2)",
      },
      {
        href: "/medicalPopularNeighborhoods",
        label: "medicalPopularNeighborhoods",
        desc: "지역별 인기 동네 (5-3)",
      },
      {
        href: "/medicalPopularNeighborhoodsRanking",
        label: "medicalPopularNeighborhoodsRanking",
        desc: "지역별 인기 동네 순위표",
      },
    ],
  },
  {
    title: "PoC3",
    items: [
      {
        href: "/foreignVisitorRegionMapV2",
        label: "foreignVisitorRegionMapV2",
        desc: "국가별 방한객 지역 분포 지도 (7, @svg-maps/south-korea 컬러 지도)",
      },
    ],
  },
  {
    title: "PoC4",
    items: [
      {
        href: "/foreignVisitorRegionMapBubble",
        label: "foreignVisitorRegionMapBubble",
        desc: "국가별 방한객 지역 분포 지도 (7, @tenqube/react-korea-bubble-map을 React 19용으로 직접 포팅)",
      },
      {
        href: "/tourismConsumptionMapDrilldown",
        label: "tourismConsumptionMapDrilldown",
        desc: "관광소비 지역별 지출액 전국→서울→강남구 드릴다운 (6)",
      },
    ],
  },
  {
    title: "KTO API 테스트",
    items: [
      { href: "/areaTarSjrnDsList", label: "areaTarSjrnDsList", desc: "관광 체류 강도" },
      { href: "/areaTarExpDsList", label: "areaTarExpDsList", desc: "관광 소비 강도" },
      { href: "/areaTouDivList", label: "areaTouDivList", desc: "관광객 다양성" },
      { href: "/areaExpDivList", label: "areaExpDivList", desc: "관광 소비 다양성" },
      { href: "/areaIntlDivList", label: "areaIntlDivList", desc: "국제적 다양성" },
    ],
  },
  {
    title: "방한관광통계 테스트",
    items: [
      {
        href: "/getEdrcntTourismStatsList",
        label: "getEdrcntTourismStatsList",
        desc: "출입국관광통계",
      },
      {
        href: "/getOvseaTuristStatsList",
        label: "getOvseaTuristStatsList",
        desc: "국민해외관광객통계",
      },
      {
        href: "/getForeignTuristStatsList",
        label: "getForeignTuristStatsList",
        desc: "방한외래관광객통계",
      },
      {
        href: "/getForeignTuristAvrgList",
        label: "getForeignTuristAvrgList",
        desc: "방한외래관광객평균체재일",
      },
      {
        href: "/getTourismBalcList",
        label: "getTourismBalcList",
        desc: "관광수지",
      },
    ],
  },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        aria-expanded={open}
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 100,
          width: 36,
          height: 36,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 4,
          border: "1px solid #E7E6E0",
          borderRadius: 8,
          background: "#fff",
          cursor: "pointer",
        }}
      >
        <span style={{ width: 16, height: 2, background: "#171A21", display: "block" }} />
        <span style={{ width: 16, height: 2, background: "#171A21", display: "block" }} />
        <span style={{ width: 16, height: 2, background: "#171A21", display: "block" }} />
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.25)",
            zIndex: 90,
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100vh",
          width: 240,
          boxSizing: "border-box",
          background: "#FBFBF8",
          borderLeft: "1px solid #E7E6E0",
          zIndex: 95,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.2s ease",
          padding: "70px 12px 12px",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          fontFamily: "ui-monospace, monospace",
          fontSize: 13,
        }}
      >
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} style={{ marginBottom: 18 }}>
            <div
              style={{ fontSize: 11, color: "#6B7280", letterSpacing: "0.08em", padding: "0 8px 10px" }}
            >
              {section.title}
            </div>
            <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {section.items.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "8px 10px",
                      borderRadius: 8,
                      textDecoration: "none",
                      color: active ? "#171A21" : "#3A424D",
                      background: active ? "#fff" : "transparent",
                      boxShadow: active ? "inset 0 0 0 1px #E7E6E0" : "none",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{item.label}</span>
                    <span style={{ fontSize: 11, color: "#6B7280", fontFamily: "sans-serif" }}>
                      {item.desc}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </aside>
    </>
  );
}
