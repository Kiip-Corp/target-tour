/* ────────────────────────────────────────────────────────────────
   한국관광공사 TourAPI(data.go.kr) · AreaTarDemDsService 공통 클라이언트
   지역별 관광 다양성 서비스 — areaTarSjrnDsList / areaTarExpDsList가 공유하는
   요청 조립·응답 파싱 로직.

   ⚠ 서버에서만 호출할 것 — data.go.kr은 CORS 헤더를 주지 않아
     브라우저에서 직접 fetch가 막힌다. "use client" 컴포넌트에서
     이 파일이나 이 파일을 쓰는 lib/kto/*를 직접 import하지 말고,
     라우트 핸들러·서버 컴포넌트를 통해서만 쓸 것.

   환경변수: KTO_SERVICE_KEY (.env.local, 공공데이터포털 일반인증키·디코딩값)

   # 서비스 명세

   | 번호 | 서비스명(국문) | 오퍼레이션 | 오퍼레이션명 |
   | --- | --- | --- | --- |
   | 1 | 지역별 관광 다양성 | areaTarSjrnDsList | 지역별 관광 체류 강도 정보 목록 조회 |
   | 2 | 지역별 관광 다양성 | areaTarExpDsList | 지역별 관광 소비 강도 정보 목록 조회 |

   오퍼레이션별 요청/응답 파라미터는 각 lib/kto/areaTar*.ts 상단 주석 참고.
   ──────────────────────────────────────────────────────────────── */

import { findAreaCd, findSigunguCd } from "./sigunguCodes";

const BASE = "https://apis.data.go.kr/B551011/AreaTarDemDsService";

export type AreaCodeParams =
  | { areaCd: string; areaNm?: never; signguCd?: string; sigunguNm?: never }
  | { areaNm: string; areaCd?: never; sigunguNm?: string; signguCd?: never };

type ApiResponse<T> = {
  response: {
    header: { resultCode: string; resultMsg: string };
    body?: {
      items?: { item?: T[] | T } | "";
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
};

/** areaNm/sigunguNm(광역·시군구명)을 areaCd/signguCd로 해석한다. 코드가 이미 있으면 그대로 쓴다. */
export function resolveAreaCodes(params: AreaCodeParams): { areaCd: string; signguCd?: string } {
  const areaCd = "areaNm" in params && params.areaNm ? findAreaCd(params.areaNm) : params.areaCd;
  if (!areaCd) {
    throw new Error(`알 수 없는 광역명입니다: ${"areaNm" in params ? params.areaNm : params.areaCd}`);
  }

  let signguCd = "signguCd" in params ? params.signguCd : undefined;
  if ("sigunguNm" in params && params.sigunguNm) {
    signguCd = findSigunguCd(params.areaNm, params.sigunguNm);
    if (!signguCd) {
      throw new Error(`알 수 없는 시군구명입니다: ${params.areaNm} ${params.sigunguNm}`);
    }
  }

  return { areaCd, signguCd };
}

/** AreaTarDemDsService의 목록 오퍼레이션(areaTarSjrnDsList/areaTarExpDsList) 공통 호출부. */
export async function fetchAreaTarDemDsList<T>(
  operation: "areaTarSjrnDsList" | "areaTarExpDsList",
  query: Record<string, string>
): Promise<T[]> {
  const serviceKey = process.env.KTO_SERVICE_KEY;
  if (!serviceKey) {
    throw new Error("KTO_SERVICE_KEY 환경변수가 설정되지 않았습니다.");
  }

  const params = new URLSearchParams({
    serviceKey,
    MobileApp: "iipuda",
    MobileOS: "ETC",
    _type: "json",
    ...query,
  });

  const res = await fetch(`${BASE}/${operation}?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`KTO API 요청 실패: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as ApiResponse<T>;
  const { header, body } = json.response;
  if (header.resultCode !== "0000") {
    throw new Error(`KTO API 오류(${header.resultCode}): ${header.resultMsg}`);
  }

  const item = body && body.items !== "" ? body.items?.item : undefined;
  if (!item) return [];
  return Array.isArray(item) ? item : [item];
}
