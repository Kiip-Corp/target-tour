import LegacyRedirect from "../../_marketingBoard/LegacyRedirect";

/** 의료관광 보드가 /medical 로 옮겨지기 전 주소. */
export default function LegacyMedicalBoardPage() {
  return <LegacyRedirect to="/medical" label="의료관광 보드" />;
}
