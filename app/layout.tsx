import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "./Sidebar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Target Tour",
  description: "2026 Kiip Corp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/*
         * 전체 라우트 목록을 여는 햄버거 메뉴는 개발 중에만 띄운다.
         * 배포본에서 보여줄 것은 홈(/)과 BoardTabs가 잇는 세 보드뿐이고,
         * 사이드바는 그 밖의 PoC·API 테스트 페이지까지 전부 드러낸다.
         * NODE_ENV는 `next dev`에서만 development라 이 조건이 그대로 기준이 된다.
         */}
        {process.env.NODE_ENV !== "production" && <Sidebar />}
        {children}
      </body>
    </html>
  );
}
