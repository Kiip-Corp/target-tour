"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * 옛 주소를 새 주소로 넘기는 안내 페이지.
 *
 * 이 앱은 `output: "export"` 정적 내보내기라 next.config의 `redirects`가 동작하지 않는다
 * (서버가 없다). 그래서 빌드된 HTML을 띄운 뒤 클라이언트에서 replace 한다 — 뒤로가기를 눌러도
 * 이 페이지로 되돌아오지 않게 push 대신 replace를 쓴다. JS가 꺼져 있어도 링크로 갈 수 있게
 * 본문에 새 주소를 남긴다.
 */
export default function LegacyRedirect({ to, label }: { to: string; label: string }) {
  const router = useRouter();

  useEffect(() => {
    router.replace(to);
  }, [router, to]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#6B7280" }}>
      {label}가 <b style={{ color: "#171A21" }}>{to}</b> 로 옮겨졌습니다. 자동으로 이동합니다 —
      바뀌지 않으면{" "}
      <Link href={to} style={{ color: "#2a78d6" }}>
        여기를 눌러 주세요
      </Link>
      .
    </div>
  );
}
