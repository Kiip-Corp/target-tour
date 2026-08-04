/* ────────────────────────────────────────────────────────────────
   한국관광공사 TourAPI(data.go.kr) · AreaTarDivService/areaIntlDivList
   지역별 국제적 다양성(International Diversity) 정보 목록 조회

   공통 안내(CORS, 환경변수, 서비스 명세)는 ./client.ts 참고.

   지역별 국제적 다양성 정보 목록을 조회하는 기능입니다.
   국제적 다양성(International Diversity): 외국인 소비액·방문자수·국적 다양성 세부 지표로 구성

   callback URL: https://apis.data.go.kr/B551011/AreaTarDivService/areaIntlDivList

   ### 1. 요청 메시지 (Request Parameter)

   | 항목명(영문) | 항목명(국문) | 필수(1)/옵션(0) | 샘플데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- |
   | numOfRows | 한 페이지 결과 수 | 0 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 0 | 1 | 현재 페이지 번호 |
   | MobileOS | OS 구분 | 1 | ETC | IOS(아이폰), AND(안드로이드), WEB(웹 사이트), ETC(키오스크 등) |
   | MobileApp | 서비스명 | 1 | AppTest | 서비스명=어플명 |
   | serviceKey | 인증키(서비스키) | 1 | 인증키(URL-Encode) | 공공데이터포털에서 발급받은 인증키 |
   | _type | 응답 메시지 형식 | 0 | json | REST 방식의 URL 호출 시 json값 추가(디폴트 응답 메시지 형식은 XML) |
   | baseYm | 기준 연월 | 1 | 202509 | 조회 기준 연월(형식: YYYYMM) |
   | areaCd | 지역 코드 | 1 | 11 | 지역 코드(지역/시군구 코드 파일 참고) |
   | signguCd | 시군구 코드 | 0 | 11530 | 시군구 코드(지역/시군구 코드 파일 참고) |
   | intlDivIxCd | 국제적 다양성 지표 코드 | 0 | 3303 | 33: 전체, 3301: 외국인 소비액, 3302: 외국인 방문자수, 3303: 외국인 방문객 국적 다양성 |

   ### 2. 응답 메시지 (Response Message)

   | 항목명 | 항목 설명 | 항목구분 | 샘플 데이터 | 항목 설명 |
   | --- | --- | --- | --- | --- |
   | resultCode | 결과 코드 | 1 | 0000 | 응답 결과 코드 |
   | resultMsg | 결과 메시지 | 1 | OK | 응답 결과 메시지 |
   | numOfRows | 한 페이지 결과 수 | 1 | 10 | 한 페이지 결과 수 |
   | pageNo | 페이지 번호 | 1 | 1 | 현재 페이지 번호 |
   | totalCount | 전체 결과 수 | 1 | 1 | 전체 결과 수 |
   | baseYm | 기준 연월 | 1 | 202509 | 기준 연월 |
   | areaCd | 지역 코드 | 1 | 11 | 지역 코드 |
   | areaNm | 지역명 | 0 | 서울특별시 | 지역명 |
   | signguCd | 시군구 코드 | 0 | 11530 | 시군구 코드 |
   | signguNm | 시군구명 | 0 | 구로구 | 시군구명 |
   | intlDivIxCd | 국제적 다양성 지표 코드 | 0 | 3303 | 33: 전체, 3301: 외국인 소비액, 3302: 외국인 방문자수, 3303: 외국인 방문객 국적 다양성 |
   | intlDivIxNm | 국제적 다양성 세부 지표명 | 0 | 외국인 방문객 국적 다양성 | 관광객 다양성 세부 지표명 |
   | intlDivIxVal | 국제적 다양성 세부 지표값 | 0 | 55.32 | 관광객 다양성 세부 지표값 |
   ──────────────────────────────────────────────────────────────── */

import { fetchKtoList, resolveAreaCodes, type AreaCodeParams } from "./client";

export type AreaIntlDivListParams = AreaCodeParams & {
  baseYm: string; // 조회 기준월 YYYYMM
  intlDivIxCd?: string; // 국제적 다양성 지표 코드
  pageNo?: number;
  numOfRows?: number;
};

export type AreaIntlDivListItem = {
  baseYm: string;
  areaCd: string;
  areaNm: string;
  signguCd: string;
  signguNm: string;
  intlDivIxCd: string;
  intlDivIxNm: string;
  intlDivIxVal: string;
};

export async function fetchAreaIntlDivList(
  params: AreaIntlDivListParams
): Promise<AreaIntlDivListItem[]> {
  const { areaCd, signguCd } = resolveAreaCodes(params);

  const query: Record<string, string> = {
    pageNo: String(params.pageNo ?? 1),
    numOfRows: String(params.numOfRows ?? 100),
    baseYm: params.baseYm,
    areaCd,
  };
  if (signguCd) query.signguCd = signguCd;
  if (params.intlDivIxCd) query.intlDivIxCd = params.intlDivIxCd;

  return fetchKtoList<AreaIntlDivListItem>("AreaTarDivService", "areaIntlDivList", query);
}
