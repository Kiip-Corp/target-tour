/**
 * 채널별 홍보 카피 생성의 공용 계약 — 채널 목록과 작성 언어 규칙.
 *
 * 화면(ContentStudio)과 생성 API(/api/generate)가 같은 정의를 봐야 "무엇을 어느 언어로
 * 만들지"가 어긋나지 않는다. 카피 본문은 전부 모델이 만든다 — 사전 작성된 샘플은 두지 않는다.
 */

/** 중국어는 간체(zh-Hans)·번체(zh-Hant)를 나눠 다룬다 — 대만·홍콩 독자에게 간체는 오답이다. */
export type Lang = "zh-Hans" | "zh-Hant" | "ja" | "th" | "en";

/** 카피의 근거 한 줄. 라벨에 지표의 정확한 뜻이 들어 있어야 모델이 오해하지 않는다. */
export type Fact = { label: string; value: string };

export type GenerateBody = {
  region: string;
  nation: string;
  channels: string[];
  /** 데이터랩 실측 근거. */
  facts: Fact[];
  /** 그 국적이 소비액을 가장 많이 쓰는 진료과목. */
  topSpecialty?: string;
  /** 전년 대비 구성비가 가장 많이 오른 진료과목 — 카피의 후크. */
  risingSpecialty?: string;
};

export type Copy = {
  channel: string;
  lang: string;
  headline: string;
  body: string;
  hashtags: string[];
  cta: string;
  ko_gloss: string;
};

export const CHANNELS = [
  { id: "xiaohongshu", label: "샤오홍슈", note: "중화권 핵심" },
  { id: "wechat", label: "위챗", note: "메시지·모먼트" },
  { id: "instagram", label: "인스타그램", note: "글로벌" },
  { id: "email", label: "이메일 뉴스레터", note: "재방문 유도" },
] as const;

export const CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  CHANNELS.map((c) => [c.id, c.label])
);

/**
 * 채널별 작성 언어.
 * - `"zh"`: 중화권 채널 — 언어는 중국어로 고정이되 간체/번체는 타깃 국적을 따른다.
 * - `"nation"`: 타깃 국적의 현지어를 그대로 따른다.
 */
export const CHANNEL_LANG: Record<string, Lang | "nation" | "zh"> = {
  xiaohongshu: "zh",
  wechat: "zh",
  instagram: "en",
  email: "nation",
};

export const NATION_LANG: Record<string, Lang> = {
  중국: "zh-Hans",
  홍콩: "zh-Hant",
  대만: "zh-Hant",
  일본: "ja",
  태국: "th",
  미국: "en",
};

export const LANG_LABEL: Record<Lang, string> = {
  "zh-Hans": "중국어 간체",
  "zh-Hant": "중국어 번체",
  ja: "일본어",
  th: "태국어",
  en: "영어",
};

/** 번체를 쓰는 타깃에 맞춘 지역 용법 — 같은 번체라도 대만과 홍콩은 어휘가 다르다. */
export const LANG_USAGE_NOTE: Record<string, string> = {
  대만: "대만 현지 용법(繁體中文·台灣)으로 쓴다.",
  홍콩: "홍콩 현지 용법(繁體中文·香港)으로 쓴다.",
};

/** 채널이 어느 언어로 나가는지 — 화면과 프롬프트가 같은 규칙을 쓴다. */
export function langOf(channelId: string, nation: string): Lang {
  const configured = CHANNEL_LANG[channelId] ?? "nation";
  if (configured === "nation") return NATION_LANG[nation] ?? "en";
  if (configured === "zh") {
    // 중화권 채널이라도 독자가 대만·홍콩이면 번체. 그 외(비중화권 타깃 포함)는 간체가 기본.
    return NATION_LANG[nation] === "zh-Hant" ? "zh-Hant" : "zh-Hans";
  }
  return configured;
}

/** BCP-47 코드나 영문 표기를 우리 Lang으로 되돌린다 — 모델이 "zh-CN"처럼 적어 보낼 때 쓴다. */
const LANG_ALIAS: Record<string, Lang> = {
  zh: "zh-Hans",
  "zh-cn": "zh-Hans",
  "zh-hans": "zh-Hans",
  "zh-sg": "zh-Hans",
  "zh-hans-cn": "zh-Hans",
  "chinese (simplified)": "zh-Hans",
  "simplified chinese": "zh-Hans",
  "zh-tw": "zh-Hant",
  "zh-hk": "zh-Hant",
  "zh-mo": "zh-Hant",
  "zh-hant": "zh-Hant",
  "zh-hant-tw": "zh-Hant",
  "zh-hant-hk": "zh-Hant",
  "chinese (traditional)": "zh-Hant",
  "traditional chinese": "zh-Hant",
  ja: "ja",
  "ja-jp": "ja",
  japanese: "ja",
  th: "th",
  "th-th": "th",
  thai: "th",
  en: "en",
  "en-us": "en",
  "en-gb": "en",
  english: "en",
};

const KNOWN_LABELS = new Set(Object.values(LANG_LABEL));

/**
 * 화면에 내보낼 언어 표기. 모델이 `lang`에 "zh-CN" 같은 코드를 적어 보내도 사람이 읽는 라벨로
 * 바꿔서 내보낸다 — 카드에 로케일 코드가 그대로 노출되지 않게 하는 마지막 방어선이다.
 */
export function langLabel(raw: string, fallback?: Lang): string {
  const text = (raw ?? "").trim();
  if (KNOWN_LABELS.has(text)) return text;
  const hit = LANG_ALIAS[text.toLowerCase().replace(/_/g, "-")];
  if (hit) return LANG_LABEL[hit];
  if (fallback) return LANG_LABEL[fallback];
  return text;
}
