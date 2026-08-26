import LegacyRedirect from "../_marketingBoard/LegacyRedirect";

/** 인기 소비동네 보드가 ③ 탭(/breakdown)으로 합쳐지기 전 주소. */
export default function LegacyPopularNeighborhoodsPage() {
  return <LegacyRedirect to="/breakdown" label="인기 소비동네 보드" />;
}
