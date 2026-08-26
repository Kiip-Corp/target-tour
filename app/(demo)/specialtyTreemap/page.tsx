import LegacyRedirect from "../_marketingBoard/LegacyRedirect";

/** 진료과목 트리맵이 ③ 탭(/breakdown)으로 합쳐지기 전 주소. */
export default function LegacySpecialtyTreemapPage() {
  return <LegacyRedirect to="/breakdown" label="진료과목 트리맵" />;
}
