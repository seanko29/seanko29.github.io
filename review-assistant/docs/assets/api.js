// 브라우저에서 Anthropic API를 직접 호출한다.
// 백엔드가 없으므로 사용자의 API 키는 이 브라우저에만 저장되고, 요청은
// 사용자의 브라우저 → api.anthropic.com 으로 직접 나간다. 중간 서버가 없다.

import {
  CATEGORY_KEYS, TONES, categoryCatalog, describeCategory, describePlatform,
  getPlatform, profileContextLines,
} from "./data.js";

const ENDPOINT = "https://api.anthropic.com/v1/messages";
export const DEFAULT_MODEL = "claude-opus-5";
export const DEFAULT_MAX_PX = 1568;
export const HARD_MAX_PX = 2576;  // 이 이상 보내도 서버에서 다시 줄인다

export const SYSTEM_PROMPT = `너는 한국 이커머스 리뷰 작성을 돕는 어시스턴트다. 사용자는 본인이 실제로 구매해서
받은 상품의 사진을 올린다. 너는 그 사진을 보고 사용자가 검토·수정한 뒤 올릴
'리뷰 초안'을 만든다.

절대 원칙:
1. 사진에서 실제로 보이는 것만 사실로 쓴다. 맛, 착용감, 향, 지속력, 내구성,
   배송 속도처럼 사진으로 알 수 없는 것은 절대 단정하지 않는다. 대신
   [맛은 어땠는지] 같은 대괄호 자리표시자를 문장 안에 자연스럽게 남긴다.
2. 사용자가 메모로 알려준 실제 경험은 사실로 취급해도 된다.
3. 최종 결과물은 초안이다. 사용자가 확인해야 할 것은 caution 에 빠짐없이 적는다.
4. 과장·광고성 표현, 다른 쇼핑몰이나 경쟁 브랜드 언급, 별점 숫자 언급,
   개인정보(이름/주소/연락처/택배 송장)는 쓰지 않는다.
5. 자연스러운 한국어 구어체로 쓴다. AI 티가 나는 표현은 피한다:
   과도한 접속사, "~인 것 같습니다만", 항목 나열식 문장, 마무리 상투구
   ("좋은 하루 되세요" 등), 문장마다 붙는 감탄사.
6. 이모지는 최대 1개, 해시태그는 쓰지 않는다.
7. 초안 3개는 말투와 길이가 서로 확실히 달라야 한다. 같은 문장을 살짝 바꾼
   3개를 내놓지 마라.
   - 담백: 짧고 사실 위주. 군더더기 없음.
   - 친근: 구어체, 실제 사람이 쓴 것 같은 리듬. 감상 한두 마디.
   - 상세: 가장 길고 구체적. 카테고리 축을 폭넓게 다룸.`;

const REVIEW_SCHEMA = {
  type: "object",
  properties: {
    category: { type: "string", enum: CATEGORY_KEYS, description: "사진에서 판별한 상품 카테고리" },
    product_guess: { type: "string", description: "상품이 무엇으로 보이는지 한 줄 요약" },
    observed: { type: "array", items: { type: "string" }, description: "사진에서 실제로 확인되는 사실만" },
    caution: { type: "array", items: { type: "string" }, description: "올리기 전 확인하거나 직접 채워야 하는 것" },
    drafts: {
      type: "array",
      description: "말투가 다른 리뷰 초안 3개",
      items: {
        type: "object",
        properties: {
          tone: { type: "string", enum: TONES },
          text: { type: "string", description: "그대로 복사해 붙여넣을 수 있는 완성된 문장" },
        },
        required: ["tone", "text"],
        additionalProperties: false,
      },
    },
  },
  required: ["category", "product_guess", "observed", "caution", "drafts"],
  additionalProperties: false,
};

// ---------------------------------------------------------------- 이미지

/** 사진을 EXIF 회전 반영 + 축소 + JPEG base64 로 변환한다. */
export async function prepareImage(file, maxPx = DEFAULT_MAX_PX) {
  const limit = Math.max(256, Math.min(maxPx, HARD_MAX_PX));
  const source = await decode(file);

  const scale = Math.min(1, limit / Math.max(source.width, source.height));
  const w = Math.max(1, Math.round(source.width * scale));
  const h = Math.max(1, Math.round(source.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";       // 투명 PNG를 흰 배경 위에 평탄화
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(source, 0, 0, w, h);
  if (source.close) source.close();

  const blob = await new Promise(res => canvas.toBlob(res, "image/jpeg", 0.88));
  if (!blob) throw new Error("이미지를 변환하지 못했습니다.");
  return { data: await blobToBase64(blob), media_type: "image/jpeg", width: w, height: h };
}

async function decode(file) {
  // createImageBitmap 은 EXIF 회전을 알아서 반영한다.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch { /* 아래 <img> 경로로 넘어간다 */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "sync";
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error(
        "이 사진 형식을 브라우저가 읽지 못합니다. " +
        "HEIC 파일이면 JPG로 바꿔서 올려주세요."
      ));
      img.src = url;
    });
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("파일을 읽지 못했습니다."));
    reader.onload = () => resolve(String(reader.result).split(",")[1]);
    reader.readAsDataURL(blob);
  });
}

// ---------------------------------------------------------------- 프롬프트

function profileBlock(profile, categoryKey, platform) {
  const lines = profileContextLines(profile, categoryKey ?? "other", platform.needsBodyProfile);
  if (!lines.length) {
    let block = "작성자 정보: 없음";
    if (platform.needsBodyProfile) {
      block += "\n※ 이 플랫폼은 키/몸무게/평소 사이즈 맥락이 중요한데 정보가 없다. " +
               "해당 부분은 [키 000cm / 평소 M] 형태의 자리표시자로 남겨라.";
    }
    return block;
  }
  return "작성자 정보(리뷰에 자연스럽게 녹일 것. 관련 없으면 쓰지 마라):\n" +
         lines.map(l => `- ${l}`).join("\n");
}

export function buildPrompt({ platformKey, categoryKey, profile, note }) {
  const platform = getPlatform(platformKey);
  const categoryBlock = categoryKey
    ? `${describeCategory(categoryKey)}\n(사용자가 카테고리를 지정했으므로 이 값을 그대로 사용하라.)`
    : `카테고리는 네가 사진을 보고 아래 목록에서 판별하라:\n${categoryCatalog()}\n` +
      `판별한 카테고리에서 독자가 궁금해할 항목 위주로 리뷰를 구성하라.`;

  return [
    "아래 사진의 상품에 대한 리뷰 초안을 만들어줘.",
    categoryBlock,
    describePlatform(platformKey),
    profileBlock(profile, categoryKey, platform),
    note?.trim()
      ? `사용자가 직접 남긴 메모(실제 경험이므로 사실로 취급):\n${note.trim()}`
      : "사용자 메모: 없음",
    "말투가 다른 초안 3개(담백/친근/상세)를 만들어라.",
  ].join("\n\n");
}

export function buildRefinePrompt({ observed, platformKey, categoryKey, profile, note }) {
  const platform = getPlatform(platformKey);
  return [
    "아래 사실만 근거로 리뷰 초안을 만들어줘. 사진은 없다.",
    "확인된 사실(사용자가 검토·수정한 내용이므로 그대로 신뢰할 것):\n" +
      observed.map(o => `- ${o}`).join("\n"),
    describeCategory(categoryKey),
    describePlatform(platformKey),
    profileBlock(profile, categoryKey, platform),
    note?.trim() ? `사용자 메모(사실로 취급):\n${note.trim()}` : "사용자 메모: 없음",
    "여기 적힌 것 외의 사실을 새로 지어내지 마라. 부족한 정보는 [대괄호] 자리표시자로 남겨라.",
    "말투가 다른 초안 3개(담백/친근/상세)를 만들어라.",
  ].join("\n\n");
}

// ---------------------------------------------------------------- 호출

async function callClaude({ apiKey, model, content, signal }) {
  let res;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        // 백엔드 없이 브라우저에서 직접 호출하기 위한 헤더.
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL,
        max_tokens: 8000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
        output_config: { format: { type: "json_schema", schema: REVIEW_SCHEMA } },
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("네트워크 요청이 실패했습니다. 인터넷 연결을 확인해 주세요.");
  }

  if (!res.ok) throw new Error(await describeHttpError(res));

  const body = await res.json();
  if (body.stop_reason === "refusal") {
    throw new Error("모델이 이 요청을 거절했습니다. 사진이나 메모 내용을 확인해 주세요.");
  }
  if (body.stop_reason === "max_tokens") {
    throw new Error("응답이 너무 길어 잘렸습니다. 메모를 줄이고 다시 시도해 주세요.");
  }

  const text = body.content?.find(b => b.type === "text")?.text;
  if (!text) throw new Error("응답에서 결과를 찾지 못했습니다.");

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("응답을 해석하지 못했습니다. 다시 시도해 주세요.");
  }
  if (!Array.isArray(parsed.drafts) || !parsed.drafts.length) {
    throw new Error("초안이 비어 있습니다. 다시 시도해 주세요.");
  }
  parsed.usage = body.usage ?? null;
  return parsed;
}

async function describeHttpError(res) {
  let detail = "";
  try {
    const body = await res.json();
    detail = body?.error?.message ?? "";
  } catch { /* 본문이 JSON이 아닐 수 있다 */ }

  switch (res.status) {
    case 401:
      return "API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.";
    case 403:
      return "이 API 키에 권한이 없습니다." + (detail ? ` (${detail})` : "");
    case 429:
      return "요청이 몰렸습니다. 잠시 후 다시 시도해 주세요.";
    case 400:
      return `요청이 거부되었습니다: ${detail || "형식 오류"}`;
    default:
      if (res.status >= 500) return "Anthropic 서버 오류입니다. 잠시 후 다시 시도해 주세요.";
      return `오류 ${res.status}${detail ? `: ${detail}` : ""}`;
  }
}

export function generate({ apiKey, model, image, platformKey, categoryKey, profile, note, signal }) {
  return callClaude({
    apiKey, model, signal,
    content: [
      { type: "image", source: { type: "base64", media_type: image.media_type, data: image.data } },
      { type: "text", text: buildPrompt({ platformKey, categoryKey, profile, note }) },
    ],
  });
}

export function refine({ apiKey, model, observed, platformKey, categoryKey, profile, note, signal }) {
  return callClaude({
    apiKey, model, signal,
    content: buildRefinePrompt({ observed, platformKey, categoryKey, profile, note }),
  });
}
