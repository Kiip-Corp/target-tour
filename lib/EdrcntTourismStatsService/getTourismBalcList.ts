/* ────────────────────────────────────────────────────────────────
   3-5 관광수지조회
   월별 관광 수입과 지출, 1인당 평균 소비액을 제공하는 기능

   callback URL: http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getTourismBalcList

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

   ### 2. 응답 메시지 (Response Message)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | resultCode | 결과코드 | 4 | 1 | 0000 | 결과코드 |
   | resultMsg | 결과메시지 | 50 | 1 | OK | 결과메시지 |
   | numOfRows | 한페이지 결과 수 | 2 | 0 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 5 | 0 | 1 | 페이지 번호 |
   | totalCount | 전체 결과 수 | 7 | 0 | 12334 | 전체 결과 수 |
   | tb | 관광수지 | 6 | 0 | 7786 | 관광수지 |
   | te | 관광지출 | 6 | 0 | 1849 | 관광지출 |
   | tePerhead | 1인당 평균소비액(관광지출) | 6 | 0 | 2323 | 1인당 평균소비액(관광지출) |
   | tr | 관광수입 | 6 | 0 | 9635 | 관광수입 |
   | rnum | 결과값 연번 | 2 | 1 | 1 | 결과값 나열 순서 |
   | trPerhead | 1인당 평균소비액(관광수입) | 6 | 0 | 8766 | 1인당 평균소비액(관광수입) |
   | ym | 년월 | 6 | 1 | 201201 | 년월 |
   ──────────────────────────────────────────────────────────────── */

const ENDPOINT =
  "http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getTourismBalcList";

export type TourismBalcParams = {
  YM: string; // 년월 YYYYMM (필수)
  pageNo?: number;
  numOfRows?: number;
};

export type TourismBalcItem = {
  tb: string;
  te: string;
  tePerhead: string;
  tr: string;
  rnum: string;
  trPerhead: string;
  ym: string;
};

type ApiResponse = {
  response: {
    header: { resultCode: string | number; resultMsg: string };
    body?: {
      items?: { item?: TourismBalcItem[] | TourismBalcItem } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

export async function fetchTourismBalcList(
  params: TourismBalcParams
): Promise<TourismBalcItem[]> {
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

  const res = await fetch(`${ENDPOINT}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`관광수지 API 요청 실패: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse;
  const header = json.response?.header;
  if (!header) {
    throw new Error("관광수지 API 응답 형식이 올바르지 않습니다.");
  }
  if (String(header.resultCode) !== "0000") {
    throw new Error(`관광수지 API 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const body = json.response.body;
  const item = body && body.items !== "" ? body.items?.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
