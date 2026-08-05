import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',  // Static HTML 내보내기 설정
  images: {
    unoptimized: true, // GitHub Pages에서 이미지 최적화 비활성화
  },
  basePath: '/target-tour',
  assetPrefix: '/target-tour',
};

export default nextConfig;
