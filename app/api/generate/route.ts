import Anthropic from "@anthropic-ai/sdk";
import {
  CHANNEL_LABEL,
  LANG_LABEL,
  LANG_USAGE_NOTE,
  langLabel,
  langOf,
  type Copy,
  type GenerateBody,
} from "../../_promoCopy/channels";

export const runtime = "nodejs";

/**
 * PoC0 `/demo`가 보내는 예전 바디. 그 화면은 목업 지표로 돌아가는 습작이라 필드 이름이 다르다.
 * ④ 콘텐츠 탭은 데이터랩 실측값을 `facts`로 넘긴다 — 라벨에 지표의 정확한 뜻이 들어 있다.
 */
type LegacyBody = {
  keywords?: [string, number][];
  agePeak?: string;
  demand?: number;
  trend?: number;
  medbeauty?: number;
  spend?: number;
  season?: string;
  flight?: string;
  fx?: string;
};

type RequestBody = GenerateBody & LegacyBody;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          channel: { type: "string", description: "채널명(한국어)" },
          lang: {
            type: "string",
            description: "작성 언어 — 채널별로 지정받은 한국어 라벨을 그대로 적는다(예: \"중국어 번체\"). 로케일 코드(zh-CN 등) 금지",
          },
          headline: { type: "string", description: "헤드라인 (현지어)" },
          body: { type: "string", description: "본문 2~3문장 (현지어)" },
          hashtags: { type: "array", items: { type: "string" } },
          cta: { type: "string", description: "행동유도 문구 (현지어)" },
          ko_gloss: { type: "string", description: "한국어 요약 한 줄 (내부 검토용)" },
        },
        required: ["channel", "lang", "headline", "body", "hashtags", "cta", "ko_gloss"],
        additionalProperties: false,
      },
    },
  },
  required: ["results"],
  additionalProperties: false,
};

function targetLines(b: RequestBody) {
  const lines = [`- 지역: ${b.region}`, `- 국적: ${b.nation}`];
  for (const f of b.facts ?? []) lines.push(`- ${f.label}: ${f.value}`);

  if (b.agePeak) lines.push(`- 주력 연령대: ${b.agePeak}`);
  if (b.demand !== undefined) lines.push(`- 수요강도: ${b.demand}/100`);
  if (b.trend !== undefined) lines.push(`- 최근 3개월 증감: ${b.trend > 0 ? "+" : ""}${b.trend}%`);
  if (b.medbeauty !== undefined) lines.push(`- 의료·뷰티 목적 비중: ${b.medbeauty}%`);
  if (b.spend !== undefined) lines.push(`- 방문당 소비액: ${b.spend}만원`);
  if (b.season) lines.push(`- 권장 집행 시점: ${b.season}`);
  if (b.flight) lines.push(`- 항공: ${b.flight}`);
  if (b.fx) lines.push(`- 환율: ${b.fx}`);
  return lines.join("\n");
}

/**
 * 카피의 후크. 전년 대비 구성비가 가장 오른 진료과목이 1순위다 — 소비가 그쪽으로 옮겨가는
 * 중이라는 뜻이라 "지금 이 얘기를 할 이유"가 된다. 없으면 소비액 1위 과목으로 떨어진다.
 */
function hookLines(b: RequestBody) {
  const out: string[] = [];
  if (b.risingSpecialty)
    out.push(
      `★ 메시지 후크: "${b.risingSpecialty}" — 이 국적의 의료소비에서 전년 대비 비중이 가장 많이 오른 진료과목이다. 이걸 콘텐츠의 핵심 후크로 삼아라.`
    );
  if (b.topSpecialty)
    out.push(
      `★ 소구 근거: 이 국적이 한국에서 의료비를 가장 많이 쓰는 과목은 "${b.topSpecialty}"다.`
    );
  if (b.keywords?.length) {
    const kwList = b.keywords.map(([kw, chg]) => `${kw}(+${chg}%)`).join(", ");
    out.push(`★ 검색 급상승 키워드: ${kwList} — 최상위 키워드를 핵심 후크로 활용하라.`);
  }
  return out.join("\n");
}

function buildPrompt(b: RequestBody) {
  const chLines = b.channels
    .map((id) => {
      const lang = langOf(id, b.nation);
      const usage = lang === "zh-Hant" ? ` (${LANG_USAGE_NOTE[b.nation] ?? "번체자로만 쓴다."})` : "";
      return `- ${CHANNEL_LABEL[id] ?? id} → ${LANG_LABEL[lang]}${usage}`;
    })
    .join("\n");

  return `너는 iipuda(이뿌다) — 한국 의료·뷰티 관광 개인화 컨시어지 플랫폼 — 의 마케팅 카피라이터다.
자격을 검증한 클리닉·뷰티샵을, 신뢰를 중시하는 해외 고객과 연결하는 서비스다.

한국관광 데이터랩 자료로 도출한 타깃:
${targetLines(b)}

${hookLines(b)}

아래 채널마다 홍보 콘텐츠를 하나씩, 지정된 언어로 작성하라. 채널 관행에 맞춘다.
${chLines}

제약:
- 과장된 의료 효과·치료 결과 보장 표현 금지. "검증된 파트너"·신뢰 중심 톤을 지킨다.
- 위 수치를 카피에 그대로 인용하지 말 것. 방문·소비 규모는 추정치가 섞여 있어, 소구 방향을
  잡는 데만 쓴다.
- 지정된 언어·표기를 정확히 지킨다. 중국어 간체와 번체는 섞지 말 것 — 번체로 지정된 채널은
  번체자로만 쓴다(대만·홍콩 독자에게 간체자는 즉시 이질감을 준다).
- lang 필드에는 위에 지정한 한국어 라벨을 그대로 적는다. zh-CN 같은 로케일 코드를 쓰지 말 것.
- ko_gloss에는 그 카피가 무엇을 근거로 무엇을 노렸는지 한국어 한 줄로 적어, 사람이 검수할 수
  있게 한다.`;
}

/**
 * 화면에 나가는 언어 표기는 모델 출력이 아니라 우리 규칙이 정한다 — 모델이 `lang`에 "zh-CN" 같은
 * 코드를 적어 보내도 카드에는 "중국어 간체/번체"가 보이게 한다. 채널명으로 못 맞추면 요청 순서로,
 * 그것도 아니면 모델이 적은 값을 라벨로 번역해 떨어진다.
 */
function withResolvedLang(results: Copy[], b: RequestBody): Copy[] {
  const idByLabel = new Map(b.channels.map((id) => [CHANNEL_LABEL[id] ?? id, id]));
  return results.map((r, i) => {
    const id = idByLabel.get((r.channel ?? "").trim()) ?? b.channels[i];
    return { ...r, lang: id ? LANG_LABEL[langOf(id, b.nation)] : langLabel(r.lang) };
  });
}

export async function POST(request: Request) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body?.channels?.length || !body.nation || !body.region) {
    return Response.json({ error: "필수 파라미터가 누락됐습니다." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json(
      { error: "생성 서버에 ANTHROPIC_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: OUTPUT_SCHEMA },
      },
      messages: [{ role: "user", content: buildPrompt(body) }],
    });

    if (response.stop_reason === "refusal") {
      return Response.json(
        { error: "요청이 거절됐어요. 입력을 조정해 다시 시도해 주세요." },
        { status: 422 }
      );
    }

    const text = response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");

    const parsed = JSON.parse(text) as { results: Copy[] };
    return Response.json({ results: withResolvedLang(parsed.results ?? [], body) });
  } catch (e) {
    console.error("[/api/generate]", e);
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json({ error: "ANTHROPIC_API_KEY가 유효하지 않습니다." }, { status: 401 });
    }
    const status = e instanceof Anthropic.APIError ? e.status || 502 : 500;
    return Response.json({ error: "콘텐츠 생성에 실패했어요." }, { status });
  }
}
