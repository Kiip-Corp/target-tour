import LegacyRedirect from "../_marketingBoard/LegacyRedirect";

/** 보드가 홈(/)으로 옮겨지기 전 주소. 정적 내보내기(output: "export")라 next.config의
 *  redirects를 쓸 수 없어, 빌드된 HTML이 클라이언트에서 새 주소로 넘긴다. */
export default function LegacyMarketingBoardPage() {
  return <LegacyRedirect to="/" label="타깃 마케팅 보드" />;
}
