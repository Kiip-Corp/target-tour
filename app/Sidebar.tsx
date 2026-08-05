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
          zIndex: 40,
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
            zIndex: 30,
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
          background: "#FBFBF8",
          borderLeft: "1px solid #E7E6E0",
          zIndex: 35,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.2s ease",
          padding: "70px 12px 12px",
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
