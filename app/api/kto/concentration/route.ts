import { fetchConcentration } from "../../../../lib/kto/concentration";
import { FIRST_YM, LAST_YM, isIndicatorKey } from "../../../../lib/kto/coverage";

export const runtime = "nodejs";

/**
 * ③ 탭 「집중도 지도」 패널이 부르는 엔드포인트. 브라우저가 data.go.kr을 직접 못 치기
 * 때문에(CORS 미제공, lib/kto/client.ts 상단 주석) 서버를 거친다 — KTO_SERVICE_KEY가
 * 클라이언트 번들로 새지 않는 효과도 같다.
 *
 * 보드 페이지들은 빌드 시점에 CSV를 읽어 정적으로 렌더되지만 이 패널만 요청 시점에
 * TourAPI를 실제로 호출한다. ④ 콘텐츠 탭이 Claude API를 라이브로 부르는 것과 같은 자리다.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ym = searchParams.get("ym") ?? LAST_YM;
  const ix = searchParams.get("ix") ?? "3302";

  if (!/^\d{6}$/.test(ym) || ym < FIRST_YM || ym > LAST_YM) {
    return Response.json(
      { error: `기준월은 ${FIRST_YM}~${LAST_YM} 사이여야 합니다.` },
      { status: 400 }
    );
  }
  if (!isIndicatorKey(ix)) {
    return Response.json({ error: `알 수 없는 지표 코드입니다: ${ix}` }, { status: 400 });
  }

  if (!process.env.KTO_SERVICE_KEY) {
    return Response.json(
      { error: "서버에 KTO_SERVICE_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  try {
    return Response.json(await fetchConcentration(ym, ix));
  } catch (e) {
    console.error("[/api/kto/concentration]", e);
    return Response.json({ error: "관광공사 API 호출에 실패했어요." }, { status: 502 });
  }
}
