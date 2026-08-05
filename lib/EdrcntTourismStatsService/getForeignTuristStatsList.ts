/* ────────────────────────────────────────────────────────────────
   3-3 방한외래관광객통계조회
   월별, 국적, 성별, 연령대, 여행목적, 입국항의 검색 조건에 따라 방한외래관광객수를 제공하는 기능

   국가코드(NAT_CD) 전체 목록은 ./readme.md 참고.

   callback URL: http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getForeignTuristStatsList

   ⚠ 레거시 TourAPI 도메인(openapi.tour.go.kr)이라 HTTPS를 지원하지 않는다 — http로만 호출된다.
     서버에서만 호출할 것(브라우저 직접 fetch는 CORS로 막힌다).
     이 서비스(EdrcntTourismStatsService)는 AreaTarDemDsService/AreaTarDivService와 별도
     활용신청이 필요하다 — 승인 전에는 정상 응답 대신 resultCode 30
     "SERVICE KEY IS NOT REGISTERED ERROR"가 돌아온다(실제 호출로 확인함).

   환경변수: KTO_SERVICE_KEY (.env.local, 공공데이터포털 일반인증키·디코딩값)

   ### 1. 요청 메시지 (Request Parameter)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | YM | 년월 | 6 | 1 | 201201 | 년월 |
   | NAT_CD | 국가코드 | 3 | 0 | 155 | 국가코드(readme.md 참고) |
   | SEX_CD | 성별코드 | 1 | 0 | F | C=승무원, F=여성, M=남성 |
   | AGE_CD | 연령대코드 | 2 | 0 | 40 | 10=0-10, 20=11-20, 30=21-30, 40=31-40, 50=41-50, 60=51-60, 70=61-70, 80=71-, 99=승무원 |
   | TRA_PURP_CD | 목적코드 | 2 | 0 | 02 | 1=공용, 2=관광, 3=상용, 4=방문, 5=유학연수, 6=취업, 7=회의참석, 8=이민, 99=기타 |
   | PORT_CD | 입국항코드 | 2 | 0 | KJ | 입국항코드 |

   ### 2. 응답 메시지 (Response Message)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | resultCode | 결과코드 | 4 | 1 | 0000 | 결과코드 |
   | resultMsg | 결과메시지 | 50 | 1 | OK | 결과메시지 |
   | numOfRows | 한페이지 결과 수 | 2 | 0 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 5 | 0 | 1 | 페이지 번호 |
   | totalCount | 전체 결과 수 | 7 | 0 | 12334 | 전체 결과 수 |
   | age | 연령 | 8 | 1 | 21 - 30 | 연령 |
   | ageCd | 연령코드 | 2 | 1 | 30 | 연령코드 |
   | natCd | 국가코드 | 3 | 1 | 155 | 국가코드 |
   | natKorNm | 국적 | 40 | 1 | 필리핀 | 국적 |
   | num | 방한외래관광객수 | 10 | 0 | 20684 | 방한외래관광객수 |
   | port | 입국항 | 10 | 1 | 광주 | 입국항 |
   | portCd | 입국항코드 | 2 | 1 | KJ | 입국항코드 |
   | rnum | 결과값 연번 | 2 | 1 | 1 | 결과값 나열 순서 |
   | sex | 성별 | 6 | 1 | 여성 | 성별 |
   | sexCd | 성별코드 | 1 | 1 | F | C=승무원, F=여성, M=남성 |
   | traPurp | 목적 | 10 | 1 | 관광 | 목적 |
   | traPurpCd | 목적코드 | 2 | 1 |  | 목적코드 |
   | ym | 년월 | 6 | 1 | 201208 | 년월 |
   ──────────────────────────────────────────────────────────────── */

const ENDPOINT =
  "http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getForeignTuristStatsList";

export type ForeignTuristStatsParams = {
  YM: string; // 년월 YYYYMM (필수)
  NAT_CD?: string; // 국가코드
  SEX_CD?: "C" | "F" | "M";
  AGE_CD?: string; // 10,20,30,40,50,60,70,80,99
  TRA_PURP_CD?: string; // 1,2,3,4,5,6,7,8,99
  PORT_CD?: string; // 입국항코드
  pageNo?: number;
  numOfRows?: number;
};

export type ForeignTuristStatsItem = {
  age: string;
  ageCd: string;
  natCd: string;
  natKorNm: string;
  num: string;
  port: string;
  portCd: string;
  rnum: string;
  sex: string;
  sexCd: string;
  traPurp: string;
  traPurpCd: string;
  ym: string;
};

type ApiResponse = {
  response: {
    header: { resultCode: string | number; resultMsg: string };
    body?: {
      items?: { item?: ForeignTuristStatsItem[] | ForeignTuristStatsItem } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

export async function fetchForeignTuristStatsList(
  params: ForeignTuristStatsParams
): Promise<ForeignTuristStatsItem[]> {
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
  if (params.SEX_CD) query.set("SEX_CD", params.SEX_CD);
  if (params.AGE_CD) query.set("AGE_CD", params.AGE_CD);
  if (params.TRA_PURP_CD) query.set("TRA_PURP_CD", params.TRA_PURP_CD);
  if (params.PORT_CD) query.set("PORT_CD", params.PORT_CD);

  const res = await fetch(`${ENDPOINT}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`방한외래관광객통계 API 요청 실패: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse;
  const header = json.response?.header;
  if (!header) {
    throw new Error("방한외래관광객통계 API 응답 형식이 올바르지 않습니다.");
  }
  if (String(header.resultCode) !== "0000") {
    throw new Error(`방한외래관광객통계 API 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const body = json.response.body;
  const item = body && body.items !== "" ? body.items?.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
