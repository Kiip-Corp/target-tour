/* ============================================================================
 *  iipuda · 외국인 밀집 지역 스캐너
 *  오프라인 채널(약국·드럭스토어·제휴 클리닉) 배치 판단용 내부 도구
 * ----------------------------------------------------------------------------
 *  [데이터 출처 · 실제 연동 시]
 *
 *  1) 지역 × 외국인 방문자수 (실측)
 *     한국관광공사_빅데이터_지역별 방문자수
 *     https://www.data.go.kr/data/15101972/openapi.do
 *     SKT 이동통신 데이터 기반. 광역(시도) / 기초(시군구) 별도 오퍼레이션.
 *     ※ 활용신청 후 "API 목록"에서 정확한 operation 명을 복사해 아래에 넣을 것.
 *
 *  2) 국적 × 성별 (실측, 전국 단위)
 *     https://www.data.go.kr/data/15136295/fileData.do
 *
 *  3) 성별 × 연령 × 목적 (실측, 전국 단위)
 *     https://www.data.go.kr/data/15136774/fileData.do
 *
 *  [핵심 제약]
 *  공개 API에 "지역 × 국적 × 성 × 연령" 4중 교차 테이블은 없다.
 *  1번은 지역은 있으나 국적/성/연령이 없고, 2·3번은 그 반대다.
 *  따라서 이 도구는 1번을 지역 총량 앵커로 두고, 2·3번의 전국 구성비를
 *  지역별 성향계수로 보정해 배분하는 추정 모델을 쓴다(raking 방식).
 *  → 절대 인원이 아니라 "상대 순위와 집중도" 판단용으로만 쓸 것.
 *
 *  [CORS]
 *  data.go.kr은 CORS 헤더를 주지 않는다. 브라우저에서 직접 fetch 불가.
 *  Next.js route handler나 별도 프록시를 한 겹 두고 서버에서 호출할 것.
 * ==========================================================================*/

export async function fetchKtoRegionVisitors({ serviceKey, yyyymm, level = "sgg" }) {
  // 서버 사이드에서만 호출. level: 'sido' | 'sgg'
  const OPERATION = level === "sido" ? "{광역_오퍼레이션명}" : "{기초_오퍼레이션명}";
  const url =
    `https://apis.data.go.kr/B551011/DataLabService/${OPERATION}` +
    `?serviceKey=${serviceKey}&startYmd=${yyyymm}01&endYmd=${yyyymm}31` +
    `&MobileOS=ETC&MobileApp=iipuda&_type=json&numOfRows=500`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.response?.body?.items?.item ?? [];
}

/* ------------------------------------------------------------------ 국가 */
export const COUNTRIES = [
  { id: "CN", name: "중국", share: 0.255, color: "#9E3B52" },
  { id: "JP", name: "일본", share: 0.182, color: "#2E7D74" },
  { id: "TW", name: "대만", share: 0.091, color: "#5B84B1" },
  { id: "US", name: "미국", share: 0.079, color: "#8A6BA8" },
  { id: "VN", name: "베트남", share: 0.062, color: "#5C8F4E" },
  { id: "HK", name: "홍콩", share: 0.041, color: "#C08A3E" },
  { id: "TH", name: "태국", share: 0.038, color: "#C4763F" },
  { id: "SG", name: "싱가포르", share: 0.024, color: "#3E8EA6" },
  { id: "ETC", name: "기타", share: 0.228, color: "#9AA4AE" },
];

export const AGES = ["20대", "30대", "40대", "50대", "60대+"];

// 국가별 연령 분포 · 여성비 (전국 기준)
export const DEMO = {
  CN: { age: [0.3, 0.27, 0.2, 0.15, 0.08], fem: 0.58 },
  JP: { age: [0.33, 0.25, 0.18, 0.16, 0.08], fem: 0.66 },
  TW: { age: [0.28, 0.27, 0.22, 0.16, 0.07], fem: 0.62 },
  US: { age: [0.22, 0.25, 0.22, 0.19, 0.12], fem: 0.45 },
  VN: { age: [0.35, 0.3, 0.2, 0.11, 0.04], fem: 0.52 },
  HK: { age: [0.27, 0.29, 0.22, 0.15, 0.07], fem: 0.57 },
  TH: { age: [0.33, 0.3, 0.2, 0.12, 0.05], fem: 0.58 },
  SG: { age: [0.25, 0.3, 0.23, 0.15, 0.07], fem: 0.56 },
  ETC: { age: [0.26, 0.27, 0.22, 0.17, 0.08], fem: 0.5 },
};

// 국가별 월 계절성 (1~12월)
export const SEASON = {
  CN: [1.0, 1.1, 0.95, 1.0, 0.98, 0.92, 1.15, 1.2, 0.98, 1.25, 0.92, 0.88],
  JP: [0.9, 0.92, 1.15, 1.1, 1.15, 0.95, 1.02, 1.12, 1.05, 1.0, 1.05, 0.95],
  TW: [0.88, 0.95, 1.05, 1.1, 1.0, 0.92, 1.05, 1.05, 1.0, 1.15, 1.05, 0.95],
  US: [0.8, 0.82, 0.92, 1.0, 1.05, 1.1, 1.2, 1.15, 1.05, 1.05, 0.9, 0.9],
  DEF: [0.82, 0.86, 0.98, 1.1, 1.05, 0.95, 1.08, 1.15, 1.02, 1.12, 0.98, 0.89],
};
export const seasonOf = (cid, m) => (SEASON[cid] || SEASON.DEF)[m - 1];

/* ---------------------------------------------------------------- 지역 */
// base = 월간 외국인 방문자 연인원(만 명·일) 기준 앵커값
// aff  = 국적 성향계수 (1 = 전국 평균 구성)
// ageMod / femMod = 지역 연령·성별 보정
export const mk = (o) => ({ aff: {}, ageMod: [1, 1, 1, 1, 1], femMod: 1, note: "", ...o });

export const SIDO = [
  mk({
    id: "11", name: "서울", lat: 37.56, lng: 126.99, base: 950,
    aff: { CN: 1.15, JP: 1.3, TW: 1.25, US: 1.1, HK: 1.2, SG: 1.2, VN: 1.05, TH: 1.1 },
    femMod: 1.06
  }),
  mk({
    id: "41", name: "경기", lat: 37.41, lng: 127.2, base: 280,
    aff: { CN: 1.3, TH: 1.2, VN: 1.15, JP: 0.7, US: 0.9 }
  }),
  mk({
    id: "26", name: "부산", lat: 35.18, lng: 129.06, base: 155,
    aff: { JP: 1.75, TW: 1.3, SG: 1.15, CN: 0.85, US: 0.7 }, femMod: 1.04,
    note: "본사 소재. 오프라인 실험 비용 가장 낮은 권역."
  }),
  mk({
    id: "50", name: "제주", lat: 33.42, lng: 126.55, base: 130,
    aff: { CN: 2.0, HK: 1.4, TW: 1.15, JP: 0.4, US: 0.4 }
  }),
  mk({
    id: "28", name: "인천", lat: 37.46, lng: 126.71, base: 120,
    aff: { CN: 1.45, VN: 1.2, TH: 1.1, JP: 0.8 }
  }),
  mk({ id: "48", name: "경남", lat: 35.24, lng: 128.69, base: 45, aff: { JP: 1.3, TW: 1.1 } }),
  mk({
    id: "51", name: "강원", lat: 37.83, lng: 128.32, base: 42,
    aff: { TW: 1.8, HK: 1.3, JP: 0.85, CN: 1.1 }
  }),
  mk({
    id: "47", name: "경북", lat: 36.29, lng: 128.66, base: 40, aff: { TW: 1.35, JP: 1.15 },
    ageMod: [0.85, 0.9, 1.05, 1.2, 1.3]
  }),
  mk({ id: "27", name: "대구", lat: 35.87, lng: 128.6, base: 33, aff: { JP: 1.2, TW: 1.1 } }),
  mk({ id: "46", name: "전남", lat: 34.87, lng: 126.99, base: 25, aff: { TW: 1.2 } }),
  mk({ id: "44", name: "충남", lat: 36.66, lng: 126.87, base: 25, aff: { CN: 1.2, VN: 1.3 } }),
  mk({ id: "29", name: "광주", lat: 35.16, lng: 126.85, base: 18, aff: { VN: 1.3, TH: 1.2 } }),
  mk({ id: "30", name: "대전", lat: 36.35, lng: 127.38, base: 17 }),
  mk({ id: "43", name: "충북", lat: 36.79, lng: 127.66, base: 16, aff: { CN: 1.2 } }),
  mk({ id: "52", name: "전북", lat: 35.72, lng: 127.15, base: 15, aff: { TW: 1.15 } }),
  mk({ id: "31", name: "울산", lat: 35.54, lng: 129.31, base: 12, aff: { JP: 1.2 } }),
  mk({ id: "36", name: "세종", lat: 36.48, lng: 127.29, base: 3 }),
];

export const SGG = [
  // 서울
  mk({
    id: "11140", name: "서울 중구", sido: "서울", lat: 37.5636, lng: 126.9976, base: 210,
    aff: { CN: 1.3, JP: 1.4, TW: 1.35, VN: 1.15, TH: 1.15, US: 0.7 }, femMod: 1.05,
    note: "명동·동대문. 관광객 대상 약국·드럭스토어 최밀집 구역."
  }),
  mk({
    id: "11680", name: "강남구", sido: "서울", lat: 37.5172, lng: 127.0473, base: 165,
    aff: { CN: 1.2, JP: 1.1, SG: 1.6, HK: 1.5, TH: 1.35, US: 1.1, TW: 1.05 },
    ageMod: [0.85, 1.05, 1.2, 1.15, 0.95], femMod: 1.18,
    note: "압구정·신사·역삼. 피부과·성형외과 밀집. 의료관광 전환 최상위."
  }),
  mk({
    id: "11440", name: "마포구", sido: "서울", lat: 37.5638, lng: 126.9084, base: 120,
    aff: { JP: 1.7, TW: 1.5, TH: 1.4, US: 1.1, CN: 0.75 },
    ageMod: [1.35, 1.05, 0.75, 0.6, 0.45], femMod: 1.08,
    note: "홍대·연남. 20대 중심, 체험형 뷰티·팝업 채널."
  }),
  mk({
    id: "11110", name: "종로구", sido: "서울", lat: 37.5735, lng: 126.979, base: 105,
    aff: { CN: 1.2, TW: 1.2, US: 1.2, JP: 1.05 },
    ageMod: [0.9, 0.95, 1.05, 1.15, 1.25],
    note: "경복궁·인사동. 체류 짧음. 인쇄물·안내소 접점."
  }),
  mk({
    id: "11170", name: "용산구", sido: "서울", lat: 37.5326, lng: 126.99, base: 78,
    aff: { US: 2.2, SG: 1.3, HK: 1.2, CN: 0.6 },
    ageMod: [0.9, 1.05, 1.1, 1.05, 1.0], femMod: 0.9,
    note: "이태원·한남. 영어권 체류층, 프리미엄 웰니스."
  }),
  mk({
    id: "11650", name: "서초구", sido: "서울", lat: 37.4837, lng: 127.0324, base: 62,
    aff: { SG: 1.35, HK: 1.25, US: 1.1, CN: 1.05 },
    ageMod: [0.85, 1.05, 1.2, 1.15, 1.0], femMod: 1.12,
    note: "반포·서초. 강남 의료권 연장선."
  }),
  mk({
    id: "11560", name: "영등포구", sido: "서울", lat: 37.5264, lng: 126.8963, base: 55,
    aff: { CN: 1.5, VN: 1.3, US: 0.9 }, note: "여의도·대림. 중화권 생활권 겹침."
  }),
  mk({
    id: "11200", name: "성동구", sido: "서울", lat: 37.5633, lng: 127.0371, base: 48,
    aff: { JP: 1.9, TW: 1.4, HK: 1.2, CN: 0.7 },
    ageMod: [1.25, 1.15, 0.85, 0.7, 0.5], femMod: 1.15,
    note: "성수. 일본·대만 20~30대 여성. 브랜드 팝업 채널."
  }),
  mk({
    id: "11710", name: "송파구", sido: "서울", lat: 37.5145, lng: 127.1059, base: 45,
    aff: { CN: 1.25, TH: 1.2, VN: 1.15 }, note: "잠실. 단체·가족 단위 비중 높음."
  }),
  mk({
    id: "11215", name: "광진구", sido: "서울", lat: 37.5385, lng: 127.0823, base: 28,
    aff: { CN: 1.3, VN: 1.2 }, ageMod: [1.3, 1.0, 0.8, 0.65, 0.5]
  }),
  mk({
    id: "11410", name: "서대문구", sido: "서울", lat: 37.5791, lng: 126.9368, base: 25,
    aff: { CN: 1.2, VN: 1.2 }, ageMod: [1.3, 1.0, 0.8, 0.7, 0.6]
  }),
  mk({
    id: "11500", name: "강서구", sido: "서울", lat: 37.5509, lng: 126.8495, base: 22,
    aff: { JP: 1.2, CN: 1.1 }, note: "마곡·김포공항. 근거리 도착 접점."
  }),
  mk({
    id: "11230", name: "동대문구", sido: "서울", lat: 37.5744, lng: 127.0396, base: 21,
    aff: { CN: 1.4, VN: 1.4, TH: 1.2 }
  }),
  // 부산
  mk({
    id: "26350", name: "해운대구", sido: "부산", lat: 35.1631, lng: 129.1636, base: 52,
    aff: { JP: 1.6, TW: 1.3, SG: 1.2, CN: 0.85 },
    ageMod: [1.05, 1.1, 1.0, 0.95, 0.85], femMod: 1.05,
    note: "해운대·센텀. 본사 인접 — 오프라인 파일럿 1순위."
  }),
  mk({
    id: "26230", name: "부산진구", sido: "부산", lat: 35.1626, lng: 129.0533, base: 38,
    aff: { JP: 1.7, TW: 1.25, CN: 0.9 }, femMod: 1.05,
    note: "서면. 부산 최대 상권, 메디컬 스트리트."
  }),
  mk({
    id: "26110", name: "부산 중구", sido: "부산", lat: 35.1064, lng: 129.0324, base: 30,
    aff: { JP: 1.9, TW: 1.2, CN: 0.8 }, note: "남포·자갈치. 일본 근거리 반복 방문."
  }),
  mk({
    id: "26500", name: "수영구", sido: "부산", lat: 35.1456, lng: 129.113, base: 22,
    aff: { JP: 1.5, TW: 1.3 }, ageMod: [1.2, 1.15, 0.9, 0.75, 0.6]
  }),
  mk({
    id: "26170", name: "부산 동구", sido: "부산", lat: 35.1293, lng: 129.045, base: 15,
    aff: { JP: 1.4, CN: 1.1 }, note: "부산역·초량. 도착 접점."
  }),
  // 제주
  mk({
    id: "50110", name: "제주시", sido: "제주", lat: 33.4996, lng: 126.5312, base: 78,
    aff: { CN: 2.1, HK: 1.4, TW: 1.2, JP: 0.4 }, note: "시내 면세·연동 상권. 중국 단체 비중."
  }),
  mk({
    id: "50130", name: "서귀포시", sido: "제주", lat: 33.2541, lng: 126.56, base: 52,
    aff: { CN: 1.8, HK: 1.3, TW: 1.2, JP: 0.5 }, ageMod: [0.85, 0.95, 1.1, 1.15, 1.15]
  }),
  // 인천
  mk({
    id: "28110", name: "인천 중구", sido: "인천", lat: 37.4738, lng: 126.6216, base: 62,
    aff: { CN: 1.5, VN: 1.2, TH: 1.15 }, note: "공항·영종. 환승 체류 — 도착 첫 접점."
  }),
  mk({
    id: "28185", name: "연수구", sido: "인천", lat: 37.4103, lng: 126.6784, base: 22,
    aff: { CN: 1.4, US: 1.1 }, note: "송도. 컨벤션·MICE 유입."
  }),
  mk({
    id: "28237", name: "부평구", sido: "인천", lat: 37.5074, lng: 126.7218, base: 12,
    aff: { VN: 1.4, CN: 1.2 }
  }),
  // 경기
  mk({
    id: "41110", name: "수원시", sido: "경기", lat: 37.2636, lng: 127.0286, base: 32,
    aff: { CN: 1.3, VN: 1.2 }
  }),
  mk({
    id: "41280", name: "고양시", sido: "경기", lat: 37.6584, lng: 126.832, base: 28,
    aff: { CN: 1.3, TH: 1.2 }
  }),
  mk({
    id: "41130", name: "성남시", sido: "경기", lat: 37.42, lng: 127.1265, base: 26,
    aff: { CN: 1.15, US: 1.1, SG: 1.15 }
  }),
  mk({
    id: "41480", name: "파주시", sido: "경기", lat: 37.7599, lng: 126.78, base: 22,
    aff: { CN: 1.6, TW: 1.2, US: 1.2 }, ageMod: [0.8, 0.9, 1.1, 1.2, 1.3],
    note: "DMZ 코스. 단체 경유형, 체류 짧음."
  }),
  mk({
    id: "41460", name: "용인시", sido: "경기", lat: 37.2411, lng: 127.1776, base: 20,
    aff: { CN: 1.3, TH: 1.3, VN: 1.2 }, ageMod: [1.2, 1.15, 0.9, 0.7, 0.5]
  }),
  mk({
    id: "41820", name: "가평군", sido: "경기", lat: 37.8315, lng: 127.5095, base: 16,
    aff: { CN: 1.8, TH: 1.5, TW: 1.2, JP: 0.5 }, note: "남이섬. 단체 버스 코스."
  }),
  mk({
    id: "41590", name: "화성시", sido: "경기", lat: 37.1996, lng: 126.8314, base: 14,
    aff: { CN: 1.2, VN: 1.3 }
  }),
  // 강원
  mk({
    id: "51150", name: "강릉시", sido: "강원", lat: 37.752, lng: 128.8761, base: 14,
    aff: { TW: 1.9, HK: 1.3, CN: 1.1, JP: 0.8 }
  }),
  mk({
    id: "51210", name: "속초시", sido: "강원", lat: 38.207, lng: 128.5918, base: 12,
    aff: { TW: 1.9, HK: 1.4, CN: 1.1, JP: 0.7 }
  }),
  mk({
    id: "51760", name: "평창군", sido: "강원", lat: 37.3705, lng: 128.3902, base: 7,
    aff: { TW: 1.7, HK: 1.5, TH: 1.4 }
  }),
  // 경북 / 경남 / 기타
  mk({
    id: "47130", name: "경주시", sido: "경북", lat: 35.8562, lng: 129.2247, base: 16,
    aff: { TW: 1.4, JP: 1.2 }, ageMod: [0.85, 0.9, 1.05, 1.2, 1.3]
  }),
  mk({
    id: "47170", name: "안동시", sido: "경북", lat: 36.5684, lng: 128.7294, base: 6,
    aff: { TW: 1.2, JP: 1.1 }, ageMod: [0.7, 0.85, 1.05, 1.3, 1.45]
  }),
  mk({
    id: "48120", name: "창원시", sido: "경남", lat: 35.2279, lng: 128.6817, base: 12,
    aff: { JP: 1.3, VN: 1.2 }
  }),
  mk({
    id: "48310", name: "거제시", sido: "경남", lat: 34.8806, lng: 128.6211, base: 8,
    aff: { JP: 1.3 }
  }),
  mk({
    id: "48220", name: "통영시", sido: "경남", lat: 34.8544, lng: 128.4331, base: 7,
    aff: { JP: 1.2, TW: 1.2 }
  }),
  mk({
    id: "46130", name: "여수시", sido: "전남", lat: 34.7604, lng: 127.6622, base: 10,
    aff: { TW: 1.3, JP: 1.1 }
  }),
  mk({
    id: "46150", name: "순천시", sido: "전남", lat: 34.9506, lng: 127.4872, base: 6,
    aff: { TW: 1.2 }
  }),
  mk({
    id: "27110", name: "대구 중구", sido: "대구", lat: 35.8693, lng: 128.6062, base: 14,
    aff: { JP: 1.3, TW: 1.2 }, note: "동성로·근대골목."
  }),
  mk({
    id: "27260", name: "수성구", sido: "대구", lat: 35.8583, lng: 128.6311, base: 7,
    aff: { JP: 1.15 }
  }),
  mk({
    id: "29110", name: "광주 동구", sido: "광주", lat: 35.1461, lng: 126.9231, base: 6,
    aff: { VN: 1.4, TH: 1.2 }
  }),
  mk({
    id: "30200", name: "유성구", sido: "대전", lat: 36.3623, lng: 127.3562, base: 8,
    aff: { CN: 1.2 }
  }),
  mk({
    id: "44130", name: "천안시", sido: "충남", lat: 36.8151, lng: 127.1139, base: 8,
    aff: { VN: 1.5, CN: 1.2 }
  }),
  mk({
    id: "43110", name: "청주시", sido: "충북", lat: 36.6424, lng: 127.489, base: 7,
    aff: { CN: 1.3, VN: 1.2 }
  }),
  mk({
    id: "52110", name: "전주시", sido: "전북", lat: 35.8242, lng: 127.148, base: 8,
    aff: { TW: 1.3, CN: 1.1 }, note: "한옥마을. 체험형 콘텐츠 강함."
  }),
  mk({
    id: "31140", name: "울산 남구", sido: "울산", lat: 35.5438, lng: 129.33, base: 5,
    aff: { JP: 1.2 }
  }),
];

/* --------------------------------------------------------- 해안선 좌표 */
export const COAST = [
  [37.78, 126.62], [37.62, 126.42], [37.45, 126.55], [37.3, 126.72], [37.1, 126.55], [36.95, 126.32],
  [36.78, 126.12], [36.62, 126.3], [36.42, 126.48], [36.1, 126.55], [35.95, 126.68], [35.78, 126.6],
  [35.62, 126.42], [35.4, 126.38], [35.1, 126.35], [34.9, 126.28], [34.7, 126.18], [34.45, 126.32],
  [34.32, 126.58], [34.4, 126.92], [34.55, 127.2], [34.42, 127.35], [34.62, 127.55], [34.75, 127.72],
  [34.88, 127.98], [34.85, 128.25], [34.98, 128.42], [34.88, 128.62], [35.05, 128.85], [35.08, 129.1],
  [35.35, 129.32], [35.55, 129.42], [35.85, 129.48], [36.05, 129.42], [36.3, 129.45], [36.55, 129.42],
  [36.85, 129.42], [37.1, 129.35], [37.42, 129.18], [37.75, 128.98], [38.05, 128.78], [38.35, 128.48],
  [38.6, 128.35], [38.55, 127.9], [38.3, 127.45], [38.25, 127.05], [38.05, 126.95], [37.9, 126.72],
];

/* ------------------------------------------------------------------ 기간 */
export const MONTHS = [];
for (let y = 2025; y <= 2026; y++)
  for (let m = 1; m <= 12; m++) {
    if (y === 2026 && m > 5) break;
    MONTHS.push({ y, m, label: `${y}.${String(m).padStart(2, "0")}` });
  }

export function normalizedAff(region) {
  // Σ_c share_c · aff_rc = 1 이 되도록 정규화 → base는 지역 총량 앵커로 유지
  let s = 0;
  const raw = {};
  COUNTRIES.forEach((c) => {
    raw[c.id] = region.aff[c.id] ?? 1;
    s += c.share * raw[c.id];
  });
  const out = {};
  COUNTRIES.forEach((c) => (out[c.id] = raw[c.id] / s));
  return out;
}

export function compute(regions, { month, countries, ages, gender }) {
  const m = month.m;
  const yoy = month.y === 2026 ? 1.12 : 1.0;

  const rows = regions.map((r) => {
    const affN = normalizedAff(r);
    let sel = 0, all = 0;
    const byCountry = {};
    const pyramid = AGES.map(() => ({ f: 0, m: 0 }));

    COUNTRIES.forEach((c) => {
      const w = r.base * yoy * c.share * affN[c.id] * seasonOf(c.id, m);
      all += w;

      // 연령 보정 분포
      const rawAge = DEMO[c.id].age.map((a, i) => a * r.ageMod[i]);
      const aSum = rawAge.reduce((x, y) => x + y, 0);
      const aFrac = ages.reduce((acc, name) => acc + rawAge[AGES.indexOf(name)] / aSum, 0);

      // 성별
      const fem = Math.min(0.95, Math.max(0.05, DEMO[c.id].fem * r.femMod));
      const gFrac = gender === "전체" ? 1 : gender === "여성" ? fem : 1 - fem;

      const on = countries.includes(c.id);
      const v = w * aFrac * gFrac;
      if (on) sel += v;
      byCountry[c.id] = on ? v : 0;

      // 피라미드는 국가 필터만 반영 (연령·성별 필터로 자기참조되지 않게)
      if (on) {
        rawAge.forEach((a, i) => {
          const share = (a / aSum) * w;
          pyramid[i].f += share * fem;
          pyramid[i].m += share * (1 - fem);
        });
      }
    });
    return { ...r, sel, all, byCountry, pyramid };
  });

  const selT = rows.reduce((a, b) => a + b.sel, 0) || 1;
  const allT = rows.reduce((a, b) => a + b.all, 0) || 1;
  return rows
    .map((r) => ({ ...r, lq: r.all > 0 ? r.sel / selT / (r.all / allT) : 0, share: r.sel / selT }))
    .sort((a, b) => b.sel - a.sel);
}
