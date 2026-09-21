import type { NextConfig } from "next";

/**
 * ④ 콘텐츠 탭의 생성 API(/api/generate)가 배포본에서도 살아 있어야 해서 정적 내보내기를 쓰지 않는다.
 * `output: 'export'`는 Request를 읽는 POST 라우트 핸들러를 지원하지 않아 out/에서 조용히 빠진다.
 * 보드 페이지들은 여전히 빌드 시점에 정적으로 렌더된다 — data/의 CSV를 읽는 것도 그때 끝난다.
 *
 * 그래서 GitHub Pages(정적 호스팅)로는 배포할 수 없다. Vercel 등 서버 런타임이 있는 곳에
 * 올리고 ANTHROPIC_API_KEY를 환경변수로 넣으면 된다.
 */
const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
