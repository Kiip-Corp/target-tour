// @tenqube/react-korea-bubble-map이 내장한 topojson(dist/esm/sido-*.js)의
// properties.CODE 값과 정확히 일치해야 지도에 매칭된다(임의 법정동코드 아님 — 번들 직접 확인).
// 특히 강원(5100000000)·전북(5200000000)은 특별자치도 전환 후 코드가 바뀐 값이라
// 통상 알려진 법정동코드(42/45)와 다르다.
export const SIDO_CODES = [
  { full: "서울특별시", short: "서울", code: "1100000000" },
  { full: "부산광역시", short: "부산", code: "2600000000" },
  { full: "대구광역시", short: "대구", code: "2700000000" },
  { full: "인천광역시", short: "인천", code: "2800000000" },
  { full: "광주광역시", short: "광주", code: "2900000000" },
  { full: "대전광역시", short: "대전", code: "3000000000" },
  { full: "울산광역시", short: "울산", code: "3100000000" },
  { full: "세종특별자치시", short: "세종", code: "3611000000" },
  { full: "경기도", short: "경기", code: "4100000000" },
  { full: "충청북도", short: "충북", code: "4300000000" },
  { full: "충청남도", short: "충남", code: "4400000000" },
  { full: "전라남도", short: "전남", code: "4600000000" },
  { full: "경상북도", short: "경북", code: "4700000000" },
  { full: "경상남도", short: "경남", code: "4800000000" },
  { full: "제주특별자치도", short: "제주", code: "5000000000" },
  { full: "강원특별자치도", short: "강원", code: "5100000000" },
  { full: "전북특별자치도", short: "전북", code: "5200000000" },
] as const;
