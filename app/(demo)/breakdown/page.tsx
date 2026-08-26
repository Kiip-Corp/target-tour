import BoardTabs from "../_marketingBoard/BoardTabs";
import DataSources from "../_marketingBoard/DataSources";
import BreakdownBoards from "./BreakdownBoards";
import { loadSpecialtyData } from "../specialtyTreemap/data";
import {
  ANNUAL_ROOT,
  MONTHLY_ROOT,
  loadPopularNeighborhoodRegions,
} from "../../_data/popularNeighborhoods";

const MUTED = "#6B7280";

export default async function BreakdownPage() {
  const [specialty, annual, monthly] = await Promise.all([
    loadSpecialtyData(),
    loadPopularNeighborhoodRegions(ANNUAL_ROOT),
    loadPopularNeighborhoodRegions(MONTHLY_ROOT),
  ]);

  return (
    <div style={{ padding: 24, fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
      <BoardTabs active="/breakdown" />

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        진료과목 · 동네 — 무엇을 · 어느 동네에서
      </h1>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 14, lineHeight: 1.7 }}>
        의료소비를 시도보다 더 잘게 쪼개 봅니다. ① 어느 <b>진료과목</b>에 돈과 방문이 몰리는지, ②
        그 소비가 시도 안에서 어느 <b>동네</b>에 몰리는지를 한 화면에 놓습니다. 연간 2018~2026년,
        월간은 2025년까지 제공됩니다.
      </p>

      <DataSources
        period="2018 ~ 2026년(연간) · 2025년(월간)"
        items={[
          {
            key: "specialtyNationwide",
            fields: "전국 기준 진료과목별 소비액·소비건수 구성비(%) — 연간 스냅샷과 월별 추이",
            use: "패널 1 트리맵의 “전국” 선택",
          },
          {
            key: "medicalRegion",
            fields:
              "시도별 진료과목 구성비(%)와, 시도 안에서 소비가 많은 행정동 5곳의 소비액·소비건수 비율(%)",
            use: "패널 1 트리맵의 시도 선택, 패널 2의 동네 추이·순위표 전부",
          },
        ]}
      />

      <div
        style={{
          background: "#FFF8E8",
          border: "1px solid #F0DFB8",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 20,
          fontSize: 11.5,
          lineHeight: 1.75,
          color: "#5C4A22",
        }}
      >
        <b style={{ display: "block", marginBottom: 4, fontSize: 11 }}>
          ⚠ 데이터 읽는 법 — 여기 숫자는 모두 절대액이 아니라 «비율(%)»입니다
        </b>
        <b>① 두 패널 다 구성비라 합이 100%입니다.</b> 진료과목 8종도, 동네 5곳도 데이터랩이 절대
        금액이 아니라 <b>비중(%)</b>으로만 줍니다. 그래서 트리맵의 사각형 면적이 곧 비중이고, 지역이
        바뀌면 &ldquo;그 지역 안에서의 몫&rdquo;으로 다시 계산됩니다 — 지역끼리 크기를 비교하는 화면이
        아닙니다. 규모(원·건)를 보려면 ① · ② 탭으로 가세요.
        <br />
        <b>② 소비액 1위와 소비건수 1위는 서로 다릅니다.</b> 돈은 피부과·성형외과에서 나가고 방문은
        약국에서 일어나기 때문에, 두 지표를 <b>반드시 좌우로 같이</b> 보셔야 합니다. 한쪽만 보면
        &ldquo;건당 단가가 높은 과목&rdquo;과 &ldquo;자주 가는 과목&rdquo;이 뒤섞입니다.
        <br />
        <b>③ 동네는 행정동 단위, 각 시도의 상위 5곳뿐입니다.</b> 6위 밑은 원본에 없어 &ldquo;나머지
        전부&rdquo;를 알 수 없고, 5곳의 비율 합도 100%가 되지 않습니다. 전국 폴더의 같은 이름 파일은
        행정동이 아니라 시도 랭킹이라(컬럼 구조가 다름) 지역 목록에서 뺐습니다 — 17개 시도만 고를 수
        있습니다.
        <br />
        <b>④ 기간 커버리지가 ① · ② 탭과 다릅니다.</b> 이 화면은 연간 2018~2026년 · 월간 2025년
        자료를 씁니다(① · ② 탭은 2020.01~2026.07 월간). 지역·기간은 두 패널이 함께 쓰므로 위에서
        한 번만 고르면 됩니다.
      </div>

      <BreakdownBoards specialty={specialty} annual={annual} monthly={monthly} />
    </div>
  );
}
