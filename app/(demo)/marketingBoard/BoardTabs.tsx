import Link from "next/link";

const BORDER = "#E7E6E0";
const INK = "#171A21";
const MUTED = "#6B7280";

const TABS = [
  { href: "/marketingBoard", step: "①", label: "타깃 마케팅", desc: "언제 · 어디에 · 누구를" },
  { href: "/marketingBoard/medical", step: "②", label: "의료관광", desc: "누가 · 어디에 · 무엇을" },
] as const;

/** 두 보드를 오가는 탭. 서버 컴포넌트라 현재 경로를 props로 받는다. */
export default function BoardTabs({ active }: { active: (typeof TABS)[number]["href"] }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
      {TABS.map((t) => {
        const on = t.href === active;
        return (
          <Link
            key={t.href}
            href={t.href}
            style={{
              display: "inline-flex",
              alignItems: "baseline",
              gap: 8,
              padding: "8px 14px",
              borderRadius: 10,
              border: `1px solid ${on ? INK : BORDER}`,
              background: on ? INK : "#fff",
              color: on ? "#fff" : MUTED,
              textDecoration: "none",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 700 }}>
              {t.step} {t.label}
            </span>
            <span style={{ fontSize: 10.5, opacity: on ? 0.8 : 1 }}>{t.desc}</span>
          </Link>
        );
      })}
    </div>
  );
}
