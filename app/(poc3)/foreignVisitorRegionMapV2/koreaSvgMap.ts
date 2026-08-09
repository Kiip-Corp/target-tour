import koreaMapRaw from "@svg-maps/south-korea";

// @svg-maps/south-korea의 types(index.d.ts)는 "svg-maps__common" 모듈을 참조하는데
// 그 패키지가 실제로 설치되어 있지 않아 타입이 전부 any로 새어나간다 — 직접 타입을 정의해 우회한다.
interface SvgMapLocation {
  id: string;
  name: string;
  path: string;
}
const koreaMap = koreaMapRaw as { viewBox: string; locations: SvgMapLocation[] };

// @svg-maps/south-korea는 지역명을 영문 id(예: "north-jeolla")로 제공한다.
// 기존 CSV 데이터는 시도 전체 명칭(예: "전북특별자치도")을 쓰므로 id → 전체/축약 명칭 매핑이 필요하다.
const REGION_NAME_BY_ID: Record<string, { full: string; short: string }> = {
  seoul: { full: "서울특별시", short: "서울" },
  busan: { full: "부산광역시", short: "부산" },
  daegu: { full: "대구광역시", short: "대구" },
  incheon: { full: "인천광역시", short: "인천" },
  gwangju: { full: "광주광역시", short: "광주" },
  ulsan: { full: "울산광역시", short: "울산" },
  daejeon: { full: "대전광역시", short: "대전" },
  sejong: { full: "세종특별자치시", short: "세종" },
  gyeonggi: { full: "경기도", short: "경기" },
  "north-chungcheong": { full: "충청북도", short: "충북" },
  "south-chungcheong": { full: "충청남도", short: "충남" },
  "south-jeolla": { full: "전라남도", short: "전남" },
  "north-gyeongsang": { full: "경상북도", short: "경북" },
  "south-gyeongsang": { full: "경상남도", short: "경남" },
  jeju: { full: "제주특별자치도", short: "제주" },
  gangwon: { full: "강원특별자치도", short: "강원" },
  "north-jeolla": { full: "전북특별자치도", short: "전북" },
};

export const KOREA_VIEW_BOX = koreaMap.viewBox;

export const REGIONS = koreaMap.locations.map((loc) => {
  const name = REGION_NAME_BY_ID[loc.id];
  if (!name) throw new Error(`@svg-maps/south-korea의 "${loc.id}"에 대응하는 지역명이 없습니다.`);
  return { id: loc.id, path: loc.path, full: name.full, short: name.short };
});
