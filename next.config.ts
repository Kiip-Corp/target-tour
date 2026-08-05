import type { NextConfig } from "next";

const isGithubPages = process.env.GH_PAGES === "true";

const nextConfig: NextConfig = {
  output: 'export',  // Static HTML 내보내기 설정
  images: {
    unoptimized: true, // GitHub Pages에서 이미지 최적화 비활성화
  },
  ...(isGithubPages && {
    basePath: '/target-tour',
    assetPrefix: '/target-tour',
    trailingSlash: true, // GitHub Pages는 <route>/index.html만 서빙 가능 — 직접 접속·새로고침 시 404 방지
  }),
};

export default nextConfig;
