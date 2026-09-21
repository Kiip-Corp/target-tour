/* ────────────────────────────────────────────────────────────────
   시군구 외국인 집중도 — ③ 진료과목·동네 탭의 「집중도 지도」 패널이 쓰는 데이터.

   데이터랩 CSV(data/)는 시도 17개까지만 내려가서 "전체 외국인 대비 우리 타깃이 유독 몰린
   동네"를 시도보다 잘게 볼 수 없다. 이 모듈은 그 공백만 TourAPI 실시간 호출로 메운다.

   ⚠ 값은 명·원 같은 절대량이 아니라 전부 «지수»다(기준선 100). 그래서 규모가 아니라
     집중도를 색으로 칠하는 데 쓰고, 지역끼리 더하거나 합계를 내면 안 된다.

   호출량 — signguCd를 빼면 그 광역의 모든 시군구가 한 응답에 오므로(client.ts 상단 주석)
   전국이 시군구 229번이 아니라 광역 17번이면 끝난다.
   ──────────────────────────────────────────────────────────────── */

import { fetchKtoList } from "./client";
import { type IndicatorKey } from "./coverage";
import { SIDO_CODES } from "../../app/_koreaBubbleMap/sidoCodes";

/** 지표 코드 → 어떤 오퍼레이션의 어떤 필드를 읽는지. 화면용 라벨은 ./coverage.ts에 있다. */
const SPEC: Record<IndicatorKey, { service: string; operation: string; param: string; valueKey: string }> = {
  "3302": { service: "AreaTarDivService", operation: "areaIntlDivList", param: "intlDivIxCd", valueKey: "intlDivIxVal" },
  "3301": { service: "AreaTarDivService", operation: "areaIntlDivList", param: "intlDivIxCd", valueKey: "intlDivIxVal" },
  "3303": { service: "AreaTarDivService", operation: "areaIntlDivList", param: "intlDivIxCd", valueKey: "intlDivIxVal" },
  "2102": { service: "AreaTarDemDsService", operation: "areaTarSjrnDsList", param: "tarSjrnDsIxCd", valueKey: "tarSjrnDsIxVal" },
};

export type SigunguValue = {
  name: string;
  /** TourAPI의 5자리 시군구 코드. */
  code: string;
  /** KoreaBubbleMap의 10자리 지역 코드(서울 드릴다운 매칭용). */
  mapCode: string;
  value: number;
};

export type RegionConcentration = {
  full: string;
  short: string;
  /** KoreaBubbleMap의 시도 코드. */
  mapCode: string;
  areaCd: string;
  /** 그 시도 총계 지수. 자료가 없으면 null. */
  value: number | null;
  sigungu: SigunguValue[];
};

export type ConcentrationResult = {
  baseYm: string;
  ix: IndicatorKey;
  regions: RegionConcentration[];
  /** 이 달에 자료가 없거나 호출이 실패한 시도명. 화면에 그대로 밝힌다. */
  missing: string[];
};

/** 시도명 → TourAPI areaCd. sigunguCodes와 sidoCodes의 광역명 17개가 정확히 일치한다. */
const AREA_CD: Record<string, string> = {
  서울특별시: "11",
  부산광역시: "26",
  대구광역시: "27",
  인천광역시: "28",
  광주광역시: "29",
  대전광역시: "30",
  울산광역시: "31",
  세종특별자치시: "36",
  경기도: "41",
  충청북도: "43",
  충청남도: "44",
  전라남도: "46",
  경상북도: "47",
  경상남도: "48",
  제주특별자치도: "50",
  강원특별자치도: "51",
  전북특별자치도: "52",
};

type Row = Record<string, string>;

/** 시군구 총계 행. 시군구가 아니라 그 광역의 합이라 목록에서 걷어내고 따로 쓴다. */
const TOTAL_ROW = "_";

async function fetchRegion(
  sido: (typeof SIDO_CODES)[number],
  areaCd: string,
  baseYm: string,
  ix: IndicatorKey
): Promise<RegionConcentration> {
  const spec = SPEC[ix];
  const rows = await fetchKtoList<Row>(spec.service, spec.operation, {
    pageNo: "1",
    numOfRows: "200",
    baseYm,
    areaCd,
    [spec.param]: ix,
  });

  let value: number | null = null;
  const sigungu: SigunguValue[] = [];

  for (const row of rows) {
    const n = Number(row[spec.valueKey]);
    if (!Number.isFinite(n)) continue;
    if (row.signguNm === TOTAL_ROW) {
      value = n;
      continue;
    }
    sigungu.push({
      name: row.signguNm,
      code: row.signguCd,
      // 5자리 시군구 코드 + "00000" = KoreaBubbleMap의 10자리 코드(예: 11680 → 1168000000).
      mapCode: `${row.signguCd}00000`,
      value: n,
    });
  }

  sigungu.sort((a, b) => b.value - a.value);
  return { full: sido.full, short: sido.short, mapCode: sido.code, areaCd, value, sigungu };
}

/**
 * 17개 시도를 한 번에 훑어 시도 총계와 그 안의 시군구 값을 모두 가져온다.
 * 한 시도가 실패해도 나머지는 그린다 — 데모 중 data.go.kr이 한 건 흔들려도 화면이 통째로
 * 죽지 않게 하고, 빠진 시도는 `missing`으로 화면에 밝힌다.
 */
export async function fetchConcentration(
  baseYm: string,
  ix: IndicatorKey
): Promise<ConcentrationResult> {
  const settled = await Promise.allSettled(
    SIDO_CODES.map((sido) => {
      const areaCd = AREA_CD[sido.full];
      return fetchRegion(sido, areaCd, baseYm, ix);
    })
  );

  const regions: RegionConcentration[] = [];
  const missing: string[] = [];

  settled.forEach((r, i) => {
    const sido = SIDO_CODES[i];
    if (r.status === "fulfilled" && (r.value.value !== null || r.value.sigungu.length > 0)) {
      regions.push(r.value);
      return;
    }
    if (r.status === "rejected") console.error(`[kto/concentration] ${sido.full}`, r.reason);
    missing.push(sido.short);
    regions.push({
      full: sido.full,
      short: sido.short,
      mapCode: sido.code,
      areaCd: AREA_CD[sido.full],
      value: null,
      sigungu: [],
    });
  });

  return { baseYm, ix, regions, missing };
}
