import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";

type Lang = "zh" | "ja" | "th" | "en";

type GenerateBody = {
  region: string;
  nation: string;
  agePeak: string;
  demand: number;
  trend: number;
  medbeauty: number;
  spend: number;
  season: string;
  flight: string;
  fx: string;
  keywords: [string, number][];
  channels: string[];
};

type Copy = {
  channel: string;
  lang: string;
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  ko_gloss: string;
};

const CHANNEL_LABEL: Record<string, string> = {
  xiaohongshu: "샤오홍슈",
  wechat: "위챗",
  instagram: "인스타그램",
  email: "이메일 뉴스레터",
};

/* 채널별 작성 언어. email은 타깃 국적의 현지어를 따른다. */
const CHANNEL_LANG: Record<string, Lang | "nation"> = {
  xiaohongshu: "zh",
  wechat: "zh",
  instagram: "en",
  email: "nation",
};

const NATION_LANG: Record<string, Lang> = {
  중국: "zh",
  홍콩: "zh",
  대만: "zh",
  일본: "ja",
  태국: "th",
  미국: "en",
};

const LANG_LABEL: Record<Lang, string> = {
  zh: "중국어 간체",
  ja: "일본어",
  th: "태국어",
  en: "영어",
};

/* ────────────────────────────────────────────────────────────────
   목업 폴백용 현지어 사전.
   ANTHROPIC_API_KEY가 있으면 이 블록은 쓰이지 않는다.
   ──────────────────────────────────────────────────────────────── */

const REGION_L: Record<string, Record<Lang, string>> = {
  "서울 강남": { zh: "首尔江南", ja: "ソウル・江南", th: "คังนัม โซล", en: "Gangnam, Seoul" },
  "서울 명동": { zh: "首尔明洞", ja: "ソウル・明洞", th: "มยองดง โซล", en: "Myeongdong, Seoul" },
  "부산 서면": { zh: "釜山西面", ja: "釜山・西面", th: "ซอมยอน ปูซาน", en: "Seomyeon, Busan" },
  "부산 해운대": { zh: "釜山海云台", ja: "釜山・海雲台", th: "แฮอุนแด ปูซาน", en: "Haeundae, Busan" },
  "대구 동성로": { zh: "大邱东城路", ja: "大邱・東城路", th: "ทงซองโน แทกู", en: "Dongseongno, Daegu" },
};

const KEYWORD_L: Record<string, Record<Lang, string>> = {
  쁘띠성형: { zh: "微整形", ja: "プチ整形", th: "ศัลยกรรมไม่ผ่าตัด", en: "non-surgical aesthetics" },
  줄기세포: { zh: "干细胞护理", ja: "幹細胞ケア", th: "สเต็มเซลล์", en: "stem cell care" },
  보톡스: { zh: "肉毒瘦脸", ja: "ボトックス", th: "โบท็อกซ์", en: "botox" },
  K뷰티: { zh: "韩妆护肤", ja: "K-ビューティー", th: "เค-บิวตี้", en: "K-beauty" },
  코성형: { zh: "鼻整形", ja: "鼻整形", th: "ศัลยกรรมจมูก", en: "rhinoplasty" },
  "stem cell": { zh: "干细胞护理", ja: "幹細胞ケア", th: "สเต็มเซลล์", en: "stem cell care" },
};

const NATION_L: Record<string, Record<Lang, string>> = {
  중국: { zh: "中国", ja: "中国", th: "จีน", en: "Chinese" },
  홍콩: { zh: "香港", ja: "香港", th: "ฮ่องกง", en: "Hong Kong" },
  대만: { zh: "台湾", ja: "台湾", th: "ไต้หวัน", en: "Taiwanese" },
  일본: { zh: "日本", ja: "日本", th: "ญี่ปุ่น", en: "Japanese" },
  태국: { zh: "泰国", ja: "タイ", th: "ไทย", en: "Thai" },
  미국: { zh: "美国", ja: "アメリカ", th: "อเมริกา", en: "American" },
};

function localize(map: Record<string, Record<Lang, string>>, key: string, lang: Lang) {
  return map[key]?.[lang] ?? key;
}

function slug(s: string) {
  return s.replace(/[^A-Za-z0-9]/g, "");
}

function sampleCopy(channelId: string, lang: Lang, b: GenerateBody): Copy {
  const kw = localize(KEYWORD_L, b.keywords[0]?.[0] ?? "", lang);
  const koKw = b.keywords[0]?.[0] ?? "";
  const reg = localize(REGION_L, b.region, lang);
  const nat = localize(NATION_L, b.nation, lang);
  const label = CHANNEL_LABEL[channelId] ?? channelId;

  const base = { channel: label, lang: LANG_LABEL[lang] };

  if (channelId === "xiaohongshu") {
    return {
      ...base,
      headline: `${kw}｜${reg} 认证诊所清单`,
      body: `iipuda 只对接资质核实过的${reg}诊所与美容院。${kw}相关咨询有中文顾问全程陪同，预约、翻译、行程一次安排好。`,
      hashtags: ["#韩国医美", `#${kw}`, `#${reg}`, "#iipuda认证"],
      cta: "点开看认证清单",
      ko_gloss: `${b.region} ${koKw} 검증 클리닉 리스트 · 중국어 상담 동행 강조`,
    };
  }

  if (channelId === "wechat") {
    return {
      ...base,
      headline: `${reg}${kw}行程，先看这份认证名单`,
      body: `我们逐家核实资质后才会推荐。填写偏好后，顾问会按你的时间与预算，整理${kw}方案和可预约的时段。`,
      hashtags: ["#iipuda", `#${kw}`, "#韩国旅行"],
      cta: "点击开始咨询",
      ko_gloss: `${koKw} 일정 상담 유도 · 예산·일정 맞춤 제안 중심`,
    };
  }

  if (channelId === "instagram") {
    return {
      ...base,
      headline: `${kw} in ${reg}, at clinics we actually vetted`,
      body: `iipuda connects ${nat} travellers with licensed, verified clinics in ${reg}. A personal concierge handles booking, translation, and your schedule — arrival to departure.`,
      hashtags: ["#KBeauty", `#${slug(kw)}`, `#${slug(reg)}`, "#VerifiedByIipuda"],
      cta: "See the verified list",
      ko_gloss: `${b.region} ${koKw} · 검증 클리닉 + 컨시어지 동행을 영어로 소구`,
    };
  }

  /* email — 국적 현지어 */
  const email: Record<Lang, Omit<Copy, "channel" | "lang">> = {
    zh: {
      headline: `${reg}${kw}：为${nat}旅客整理的认证诊所清单`,
      body: `iipuda 逐家核实资质后才收录。顾问会按你的日程给出${kw}方案、预约时段与往返动线，全程有母语沟通。`,
      hashtags: ["#iipuda", `#${kw}`],
      cta: "查看认证清单",
      ko_gloss: `${koKw} 뉴스레터 · 검증 절차와 모국어 상담을 신뢰 근거로 제시`,
    },
    ja: {
      headline: `${reg}の${kw}、審査を通ったクリニックだけ`,
      body: `iipudaは資格を確認したクリニックとサロンのみをご紹介します。予約から通訳、当日の移動までコンシェルジュが伴走します。`,
      hashtags: ["#iipuda", `#${kw}`],
      cta: "認証リストを見る",
      ko_gloss: `${koKw} 뉴스레터 · 심사 통과 클리닉과 동행 서비스를 강조`,
    },
    th: {
      headline: `${kw} ที่คลินิกซึ่งผ่านการตรวจสอบใน${reg}`,
      body: `iipuda จับคู่คุณกับคลินิกและร้านความงามที่เราตรวจสอบใบอนุญาตแล้วเท่านั้น มีที่ปรึกษาดูแลตั้งแต่การนัดหมาย การแปล จนจบทริป`,
      hashtags: ["#iipuda", `#${kw}`],
      cta: "ดูรายชื่อคลินิก",
      ko_gloss: `${koKw} 뉴스레터 · 라이선스 검증과 통역 동행을 태국어로 소구`,
    },
    en: {
      headline: `${kw} in ${reg} — only at clinics we verified`,
      body: `iipuda lists a clinic only after we check its licence and track record. Your concierge arranges consultations, translation, and transfers around your itinerary.`,
      hashtags: ["#iipuda", `#${slug(kw)}`],
      cta: "View the verified list",
      ko_gloss: `${koKw} 뉴스레터 · 검증 절차를 신뢰 근거로 제시`,
    },
  };

  return { ...base, ...email[lang] };
}

function buildSamples(b: GenerateBody): Copy[] {
  return b.channels.map((id) => {
    const configured = CHANNEL_LANG[id] ?? "nation";
    const lang: Lang =
      configured === "nation" ? NATION_LANG[b.nation] ?? "en" : configured;
    return sampleCopy(id, lang, b);
  });
}

/* ──────────────────────────────────────────────────────────────── */

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    results: {
      type: "array",
      items: {
        type: "object",
        properties: {
          channel: { type: "string", description: "채널명(한국어)" },
          lang: { type: "string", description: "작성 언어" },
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

function buildPrompt(b: GenerateBody) {
  const kwList = b.keywords.map(([kw, chg]) => `${kw}(+${chg}%)`).join(", ");
  const topKeyword = b.keywords[0]?.[0] ?? "";
  const chLabels = b.channels.map((id) => CHANNEL_LABEL[id] ?? id).join(", ");

  return `너는 iipuda(이뿌다) — 한국 의료·뷰티 관광 개인화 컨시어지 플랫폼 — 의 마케팅 카피라이터다.
검증된 강남·부산 클리닉과 뷰티샵을, 신뢰를 중시하는 해외 여성 고객과 연결하는 서비스다.

관광데이터 분석 결과 도출된 타깃:
- 지역: ${b.region}
- 국적: ${b.nation} / 주력 연령대: ${b.agePeak}
- 수요강도: ${b.demand}/100, 최근 3개월 ${b.trend > 0 ? "+" : ""}${b.trend}%
- 의료·뷰티 목적 비중: ${b.medbeauty}% / 방문당 소비액: ${b.spend}만원 (고가치)
- 권장 집행 시점: ${b.season}
- 항공: ${b.flight} / 환율: ${b.fx}

★ 메시지 후크(검색 급상승 키워드): ${kwList}
  → 반드시 최상위 키워드 "${topKeyword}"을(를) 콘텐츠의 핵심 후크로 활용할 것.

다음 채널별 홍보 콘텐츠를 채널당 하나씩 작성하라: ${chLabels}
각 채널은 채널 관행과 ${b.nation} 독자의 언어로 작성한다.
(샤오홍슈·위챗→중국어 간체 / 인스타그램→영어+현지어 / 이메일→현지어)
과장된 의료 효과 표현 금지, "검증된 파트너"·신뢰 중심 톤 유지.`;
}

export async function POST(request: Request) {
  let body: GenerateBody;
  try {
    body = (await request.json()) as GenerateBody;
  } catch {
    return Response.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  if (!body?.channels?.length || !body.nation || !body.region) {
    return Response.json({ error: "필수 파라미터가 누락됐습니다." }, { status: 400 });
  }

  /* 키가 없으면 사전 작성된 샘플 카피로 폴백한다.
     키를 넣으면 코드 변경 없이 아래 실제 생성 경로로 넘어간다. */
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return Response.json({ results: buildSamples(body), demo: true });
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
    return Response.json({ results: parsed.results, demo: false });
  } catch (e) {
    console.error("[/api/generate]", e);
    /* 키가 자리표시자이거나 만료된 경우도 샘플로 폴백해 데모가 끊기지 않게 한다. */
    if (e instanceof Anthropic.AuthenticationError) {
      return Response.json({ results: buildSamples(body), demo: true });
    }
    const status = e instanceof Anthropic.APIError ? e.status || 502 : 500;
    return Response.json({ error: "콘텐츠 생성에 실패했어요." }, { status });
  }
}
