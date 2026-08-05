/* ────────────────────────────────────────────────────────────────
   TargetTour 데모 데이터 레이어
   2026 관광데이터 활용 공모전 · 웹·앱 구현 부문 · 지정과제 8
   iipuda 의료·뷰티 관광 기준

   ▼▼▼ KTO / 외부 OpenAPI 연동 지점 ▼▼▼
   현재는 데모용 목업입니다. 실서비스 전환 시 아래 소스로 각 값을 채웁니다.

   [수요·다양성]  관광 다양성 지수, 관광 수요강도 지수      → data.go.kr (KTO)
   [시장·소비]    방한 외래관광객(국적·월·연령), 외국인 소비  → 한국관광 데이터랩 / TourAPI, 신용카드 소비 데이터
   [검색 관심도]  의료·시술 키워드 검색량 변화             → 네이버 데이터랩 / Google Trends API
   [항공 증편]    노선별 운항·증편 이벤트                  → 항공정보포털(에어포탈), 한국공항공사
   [환율·유가]    (확장) 통화별 환율, 항공유가             → 한국은행 ECOS API, 오픈 FX API

   ⚠ 브라우저에서 data.go.kr 직접 호출은 CORS 차단 가능
      → 얇은 프록시 백엔드(Express/Cloud Function) 한 개로 우회 (약 반나절)
   ──────────────────────────────────────────────────────────────── */

export const REGIONS = ["서울 강남", "서울 명동", "부산 서면", "부산 해운대", "대구 동성로"];
export const NATIONS = ["중국", "홍콩", "대만", "일본", "태국", "미국"];
export const REGION_FACTOR = {
  "서울 강남": 1.0,
  "서울 명동": 0.9,
  "부산 서면": 0.5,
  "부산 해운대": 0.55,
  "대구 동성로": 0.3,
};

/* 지역 × 국적 : [수요강도 0~100, 최근3개월 증감%, 의료·뷰티 목적비중%] */
export function fetchDemandMatrix() {
  // prettier-ignore
  const M = {
    "서울 강남": { 중국: [88, 12, 41], 홍콩: [74, 18, 52], 대만: [61, 9, 38], 일본: [57, -4, 22], 태국: [48, 15, 29], 미국: [39, 6, 17] },
    "서울 명동": { 중국: [82, 4, 19], 홍콩: [66, 7, 24], 대만: [58, 11, 21], 일본: [71, -2, 12], 태국: [55, 9, 15], 미국: [44, 3, 9] },
    "부산 서면": { 중국: [54, 8, 27], 홍콩: [49, 14, 33], 대만: [67, 26, 44], 일본: [63, 5, 18], 태국: [41, 12, 20], 미국: [31, 7, 11] },
    "부산 해운대": { 중국: [46, 6, 15], 홍콩: [52, 17, 29], 대만: [71, 31, 39], 일본: [68, 9, 14], 태국: [38, 10, 17], 미국: [35, 12, 13] },
    "대구 동성로": { 중국: [43, 3, 22], 홍콩: [37, 5, 26], 대만: [45, 10, 31], 일본: [41, -6, 19], 태국: [33, 4, 18], 미국: [24, 2, 8] },
  };
  const out = {};
  for (const r of REGIONS) {
    out[r] = {};
    for (const n of NATIONS) {
      const [demand, trend, medbeauty] = M[r][n];
      out[r][n] = { demand, trend, medbeauty };
    }
  }
  return out;
}

/* 국적별 시장·소비·타이밍 (서울 기준, 지역계수로 방문자 스케일) */
export const NATION_DATA = {
  중국: {
    visitors: 128, yoy: 14, spend: 182, agePeak: "30–39",
    keywords: [["쁘띠성형", 38], ["리프팅", 22], ["눈성형", 15]],
    season: "10월 국경절 연휴 (9월 3주부터 선집행)",
    flight: "상하이–인천 주 12편 증편 (6월)",
    fx: "위안화 강세 · 방한 비용 유리",
  },
  홍콩: {
    visitors: 47, yoy: 21, spend: 264, agePeak: "30–44",
    keywords: [["줄기세포", 41], ["안티에이징", 29], ["피부과", 18]],
    season: "12–2월 겨울 성수기 (11월 중순 선집행)",
    flight: "홍콩–부산 신규 취항 (7월)",
    fx: "HKD 안정 · 중립",
  },
  대만: {
    visitors: 63, yoy: 27, spend: 198, agePeak: "25–39",
    keywords: [["보톡스", 33], ["윤곽주사", 25], ["미백", 12]],
    season: "7–8월 여름방학 + 1월 설연휴",
    flight: "타이베이–부산 주 7편 증편 (7월)",
    fx: "TWD 소폭 강세 · 유리",
  },
  일본: {
    visitors: 92, yoy: -3, spend: 141, agePeak: "20–34",
    keywords: [["K뷰티", 19], ["피부관리", 14], ["색소침착", 8]],
    season: "3–4월 벚꽃, 9월 실버위크",
    flight: "증편 이벤트 없음",
    fx: "엔저 지속 · 방한 부담",
  },
  태국: {
    visitors: 38, yoy: 16, spend: 156, agePeak: "25–39",
    keywords: [["코성형", 28], ["지방이식", 17], ["모발이식", 11]],
    season: "4월 송끄란, 11–12월 건기",
    flight: "방콕–인천 주 4편 증편 (8월)",
    fx: "THB 약세 · 다소 부담",
  },
  미국: {
    visitors: 29, yoy: 9, spend: 288, agePeak: "30–49",
    keywords: [["stem cell", 24], ["K-beauty", 16], ["dermatology", 9]],
    season: "6–8월 여름 휴가철",
    flight: "증편 이벤트 없음",
    fx: "USD 강세 · 방한 비용 유리",
  },
};

export const FUEL_TREND = "항공유가 전분기 대비 −4.2% (하향 안정)"; // 확장 지표

export const CHANNELS = [
  { id: "xiaohongshu", label: "샤오홍슈", note: "중화권 핵심" },
  { id: "wechat", label: "위챗", note: "메시지·모먼트" },
  { id: "instagram", label: "인스타그램", note: "글로벌" },
  { id: "email", label: "이메일 뉴스레터", note: "재방문 유도" },
];

/* 6개월 수요강도 추이 */
export function makeTrendSeries(data, region) {
  const months = ["2월", "3월", "4월", "5월", "6월", "7월"];
  const top = [...NATIONS]
    .sort((a, b) => data[region][b].demand - data[region][a].demand)
    .slice(0, 3);
  return months.map((m, i) => {
    const row = { month: m };
    for (const n of top) {
      const { demand, trend } = data[region][n];
      const base = demand - (trend / 100) * demand;
      const step = ((demand - base) / 5) * i;
      const wobble = Math.sin(i * 1.3 + n.length) * 3;
      row[n] = Math.max(0, Math.round(base + step + wobble));
    }
    return row;
  });
}

/* 지역 반영 방문자수 (천 명/월) */
export function visitorsFor(nation, region) {
  return Math.round(NATION_DATA[nation].visitors * REGION_FACTOR[region]);
}

/* 추천 스코어 : 수요 0.30 + 성장 0.20 + 의료뷰티 0.25 + 소비액 0.25 */
export function recommend(data, region) {
  const maxSpend = Math.max(...NATIONS.map((n) => NATION_DATA[n].spend));
  let best = null;
  for (const n of NATIONS) {
    const { demand, trend, medbeauty } = data[region][n];
    const { spend, yoy } = NATION_DATA[n];
    const score =
      0.3 * demand +
      0.2 * Math.max(0, yoy + 20) +
      0.25 * medbeauty +
      0.25 * ((spend / maxSpend) * 100);
    if (!best || score > best.score) {
      best = { nation: n, demand, trend, medbeauty, spend, yoy, score: Math.round(score) };
    }
  }
  return best;
}
