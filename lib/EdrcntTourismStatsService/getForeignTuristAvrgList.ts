/* ────────────────────────────────────────────────────────────────
   3-4 방한외래관광객평균체재일조회
   월별, 국적의 검색 조건에 따라 방한외래관광객 평균체재일수를 제공하는 기능

   callback URL: http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getForeignTuristAvrgList

   ⚠ 레거시 TourAPI 도메인(openapi.tour.go.kr)이라 HTTPS를 지원하지 않는다 — http로만 호출된다.
     서버에서만 호출할 것(브라우저 직접 fetch는 CORS로 막힌다).
     이 서비스(EdrcntTourismStatsService)는 AreaTarDemDsService/AreaTarDivService와 별도
     활용신청이 필요하다 — 승인 전에는 정상 응답 대신 resultCode 30
     "SERVICE KEY IS NOT REGISTERED ERROR"가 돌아온다(실제 호출로 확인함).

   환경변수: KTO_SERVICE_KEY (.env.local, 공공데이터포털 일반인증키·디코딩값)

   ### 1. 요청 메시지 (Request Parameter)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | YM | 년월 | 6 | 1 | 201209 | 년월 |
   | NAT_CD | 국가코드 | 3 | 0 | 583 | 국가코드 |

   ### 2. 응답 메시지 (Response Message)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | resultCode | 결과코드 | 4 | 1 | 0000 | 결과코드 |
   | resultMsg | 결과메시지 | 50 | 1 | OK | 결과메시지 |
   | numOfRows | 한페이지 결과 수 | 2 | 0 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 5 | 0 | 1 | 페이지 번호 |
   | totalCount | 전체 결과 수 | 7 | 0 | 12334 | 전체 결과 수 |
   | natCd | 국가코드 | 3 | 1 | 583 | 국가코드 |
   | natKorNm | 국적 | 40 | 1 | 탄자니아 | 국적 |
   | rnum | 결과값 연번 | 2 | 1 | 1 | 결과값 나열 순서 |
   | sojAvg | 평균체재일 | 3 | 0 | 8.3 | 평균체재일 |
   | sojTot | 평균체재일수 | 5 | 0 | 50 | 평균체재일수 |
   | ym | 년월 | 6 | 1 | 201210 | 년월 |
   ──────────────────────────────────────────────────────────────── */

const ENDPOINT =
  "http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getForeignTuristAvrgList";

export type ForeignTuristAvrgParams = {
  YM: string; // 년월 YYYYMM (필수)
  NAT_CD?: string; // 국가코드
  pageNo?: number;
  numOfRows?: number;
};

export type ForeignTuristAvrgItem = {
  natCd: string;
  natKorNm: string;
  rnum: string;
  sojAvg: string;
  sojTot: string;
  ym: string;
};

type ApiResponse = {
  response: {
    header: { resultCode: string | number; resultMsg: string };
    body?: {
      items?: { item?: ForeignTuristAvrgItem[] | ForeignTuristAvrgItem } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

export async function fetchForeignTuristAvrgList(
  params: ForeignTuristAvrgParams
): Promise<ForeignTuristAvrgItem[]> {
  const serviceKey = process.env.KTO_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("KTO_SERVICE_KEY 환경변수가 설정되지 않았습니다.");
  }

  const query = new URLSearchParams({
    serviceKey,
    MobileApp: "iipuda",
    MobileOS: "ETC",
    _type: "json",
    pageNo: String(params.pageNo ?? 1),
    numOfRows: String(params.numOfRows ?? 100),
    YM: params.YM,
  });
  if (params.NAT_CD) query.set("NAT_CD", params.NAT_CD);

  const res = await fetch(`${ENDPOINT}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`방한외래관광객평균체재일 API 요청 실패: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse;
  const header = json.response?.header;
  if (!header) {
    throw new Error("방한외래관광객평균체재일 API 응답 형식이 올바르지 않습니다.");
  }
  if (String(header.resultCode) !== "0000") {
    throw new Error(`방한외래관광객평균체재일 API 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const body = json.response.body;
  const item = body && body.items !== "" ? body.items?.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
