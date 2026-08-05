/* ────────────────────────────────────────────────────────────────
   3-2 국민해외관광객통계조회
   월별, 성별, 연령대, 출국항의 검색 조건에 따라 국민해외관광객수를 제공하는 기능

   callback URL: http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getOvseaTuristStatsList

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
   | SEX_CD | 성별코드 | 1 | 0 | C | C=승무원, F=여성, M=남성 |
   | AGE_CD | 연령대코드 | 2 | 0 | 20 | 10=0-10, 20=11-20, 30=21-30, 40=31-40, 50=41-50, 60=51-60, 70=61-70, 80=71-, 99=승무원 |
   | PORT_CD | 출국항코드 | 2 | 0 | PS | P9=공항기타, V9=항구기타, BP=반포도심, CC=춘천, CH=전주, CJ=제주, CU=청주, DR=도라산, DS=도심, GC=감천, GP=김포공항, GS=고성, IA=인천공항, IC=인천, KE=거제, KH=김해, KJ=광주, KP=김포, KS=군산, KY=광양, MP=목포, MS=마산, OS=오산, PH=포항, PM=판문점, PS=부산, PT=평택, SA=보호소, SB=세종로, SC=사천, SN=성남, SO=속초, SU=서울, TG=대구, TH=동해, TJ=대전, TS=대산, TY=통영, UJ=의정부, US=울산, YA=양양공항, YS=여수, MA=무안, IP=정보팀, KC=기타 |

   ### 2. 응답 메시지 (Response Message)

   | 항목명(영문) | 항목명(국문) | 항목크기 | 항목구분 | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- | --- |
   | resultCode | 결과코드 | 4 | 1 | 0000 | 결과코드 |
   | resultMsg | 결과메시지 | 50 | 1 | OK | 결과메시지 |
   | numOfRows | 한페이지 결과 수 | 2 | 0 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 5 | 0 | 1 | 페이지 번호 |
   | totalCount | 전체 결과 수 | 7 | 0 | 12334 | 전체 결과 수 |
   | age | 연령 | 8 | 1 | 11 - 20 | 연령범위 |
   | ageCd | 연령코드 | 2 | 1 | 20 | 연령코드 |
   | num | 국민해외관광객수 | 6 | 0 | 1055 | 국민해외관광객수 |
   | port | 출국항 | 10 | 1 | 부산 | 출국항 |
   | portCd | 출국항코드 | 2 | 1 | PS | 출국항코드 |
   | rnum | 결과값 연번 | 2 | 1 | 1 | 결과값 나열 순서 |
   | sex | 성별 | 6 | 1 | 여성 | 성별 |
   | sexCd | 성별코드 | 2 | 1 | F | 성별코드 |
   | ym | 년월 | 6 | 1 | 201208 | 년월 |
   ──────────────────────────────────────────────────────────────── */

const ENDPOINT =
  "http://openapi.tour.go.kr/openapi/service/EdrcntTourismStatsService/getOvseaTuristStatsList";

export type OvseaTuristStatsParams = {
  YM: string; // 년월 YYYYMM (필수)
  SEX_CD?: "C" | "F" | "M";
  AGE_CD?: string; // 10,20,30,40,50,60,70,80,99
  PORT_CD?: string; // 출국항코드
  pageNo?: number;
  numOfRows?: number;
};

export type OvseaTuristStatsItem = {
  age: string;
  ageCd: string;
  num: string;
  port: string;
  portCd: string;
  rnum: string;
  sex: string;
  sexCd: string;
  ym: string;
};

type ApiResponse = {
  response: {
    header: { resultCode: string | number; resultMsg: string };
    body?: {
      items?: { item?: OvseaTuristStatsItem[] | OvseaTuristStatsItem } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

export async function fetchOvseaTuristStatsList(
  params: OvseaTuristStatsParams
): Promise<OvseaTuristStatsItem[]> {
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
  if (params.SEX_CD) query.set("SEX_CD", params.SEX_CD);
  if (params.AGE_CD) query.set("AGE_CD", params.AGE_CD);
  if (params.PORT_CD) query.set("PORT_CD", params.PORT_CD);

  const res = await fetch(`${ENDPOINT}?${query.toString()}`);
  if (!res.ok) {
    throw new Error(`국민해외관광객통계 API 요청 실패: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse;
  const header = json.response?.header;
  if (!header) {
    throw new Error("국민해외관광객통계 API 응답 형식이 올바르지 않습니다.");
  }
  if (String(header.resultCode) !== "0000") {
    throw new Error(`국민해외관광객통계 API 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const body = json.response.body;
  const item = body && body.items !== "" ? body.items?.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
