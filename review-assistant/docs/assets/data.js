// 카테고리 · 플랫폼 정의. core/categories.py, core/platforms.py 와 같은 내용을 브라우저용으로 옮긴 것.
// 둘 중 하나만 고치면 어긋나므로 함께 수정할 것.

export const CATEGORIES = [
  { key: "clothing", label: "의류",
    axes: ["사이즈감과 핏", "소재와 두께", "색상(실물 대비)", "봉제/마감 상태", "어떤 상황에 입을지"],
    unknowable: ["착용감", "세탁 후 변형", "보온성", "실착 사이즈 적합도"] },
  { key: "shoes", label: "신발",
    axes: ["사이즈(정사이즈/반치수)", "발볼과 착화감", "무게", "쿠션감", "디자인과 색상"],
    unknowable: ["장시간 착화감", "내구성", "미끄럼 방지 성능"] },
  { key: "bag_accessory", label: "가방·잡화",
    axes: ["크기와 수납력", "소재와 마감", "무게", "색상", "데일리 활용도"],
    unknowable: ["내구성", "장기 사용 시 변형"] },
  { key: "food_delivery", label: "배달음식",
    axes: ["양", "포장 상태", "도착 시 온도", "구성", "가격 대비"],
    unknowable: ["맛", "간", "재주문 의사"] },
  { key: "food_product", label: "식품·신선식품",
    axes: ["포장/보냉 상태", "양과 개수", "겉보기 신선도", "구성", "가성비"],
    unknowable: ["맛", "식감", "유통기한 만족도", "조리 후 결과"] },
  { key: "beauty", label: "화장품·뷰티",
    axes: ["용기와 용량", "제형과 색", "향(표기 기준)", "사용감", "피부 타입 적합성"],
    unknowable: ["발림성", "지속력", "자극 여부", "실제 효과"] },
  { key: "electronics", label: "전자기기",
    axes: ["구성품", "마감과 크기", "설치/연결 편의", "디자인", "소음"],
    unknowable: ["성능", "배터리 지속", "발열", "장기 안정성"] },
  { key: "home_living", label: "생활용품·주방",
    axes: ["크기와 용량", "재질과 마감", "실사용 편의", "수납/자리 차지", "가성비"],
    unknowable: ["내구성", "세척 편의", "장기 사용감"] },
  { key: "furniture_interior", label: "가구·인테리어",
    axes: ["실제 크기", "색감과 질감", "조립 난이도", "공간과의 조화", "마감 상태"],
    unknowable: ["내구성", "흔들림", "장기 사용감"] },
  { key: "baby_kids", label: "유아·아동",
    axes: ["사이즈", "소재와 촉감", "안전 마감", "디자인", "구성"],
    unknowable: ["아이 반응", "세탁 내구성", "실착 만족도"] },
  { key: "pet", label: "반려동물",
    axes: ["크기", "소재", "구성", "마감", "가성비"],
    unknowable: ["반려동물 반응", "기호성", "내구성"] },
  { key: "sports_outdoor", label: "스포츠·아웃도어",
    axes: ["사이즈", "소재와 무게", "구성품", "마감", "용도 적합성"],
    unknowable: ["성능", "착용감", "내구성"] },
  { key: "book_stationery", label: "도서·문구",
    axes: ["상태(배송 중 손상 여부)", "크기와 두께", "지질/인쇄 상태", "구성"],
    unknowable: ["내용 만족도", "필기감"] },
  { key: "other", label: "기타",
    axes: ["겉보기 상태", "구성", "크기", "마감", "포장"],
    unknowable: ["실사용 성능", "내구성"] },
];

export const CATEGORY_KEYS = CATEGORIES.map(c => c.key);
const CATEGORY_MAP = new Map(CATEGORIES.map(c => [c.key, c]));

export const getCategory = key => CATEGORY_MAP.get(key) ?? CATEGORY_MAP.get("other");

export function describeCategory(key) {
  const c = getCategory(key);
  return [
    `카테고리: ${c.label}`,
    `- 이 카테고리 리뷰에서 독자가 궁금해하는 것: ${c.axes.join(", ")}`,
    `- 사진만으로는 알 수 없는 것(단정 금지, 자리표시자로 남길 것): ${c.unknowable.join(", ")}`,
  ].join("\n");
}

export const categoryCatalog = () =>
  CATEGORIES.map(c => `- ${c.key}: ${c.label}`).join("\n");

export const PLATFORMS = [
  { key: "naver", label: "네이버 스마트스토어",
    style: "존댓말 구어체. 담백하고 사실 위주. 판매자가 읽는다는 걸 의식한 정중한 톤.",
    lengthHint: "100~200자", minChars: 20,
    avoid: ["해시태그", "다른 쇼핑몰 언급", "별점 숫자 언급", "이벤트/적립금 언급"],
    needsBodyProfile: false,
    extras: ["포토리뷰 적립 조건상 너무 짧으면 안 된다."] },
  { key: "coupang", label: "쿠팡",
    style: "존댓말이지만 더 짧고 실용적. 결론부터. 배송에 관한 한 줄이 자연스럽다.",
    lengthHint: "60~150자", minChars: 20,
    avoid: ["해시태그", "다른 쇼핑몰 언급", "판매자에게 말 거는 문장", "과장 표현"],
    needsBodyProfile: false,
    extras: ["배송 관련 언급은 사용자가 실제로 겪은 경우에만. 모르면 자리표시자로 남긴다."] },
  { key: "musinsa", label: "무신사",
    style: "반말 또는 음슴체 허용. 사이즈감과 핏이 본론. 스타일 코멘트가 붙으면 좋다.",
    lengthHint: "60~180자", minChars: 20,
    avoid: ["해시태그", "과한 존댓말", "다른 쇼핑몰 언급"],
    needsBodyProfile: true,
    extras: [
      "무신사 리뷰는 작성자 키/몸무게/평소 사이즈가 맥락으로 깔린다.",
      "'평소 M인데 이건 L이 맞음' 같은 사이즈 비교 문장이 가장 유용하다.",
    ] },
  { key: "ohouse", label: "오늘의집",
    style: "존댓말 구어체. 공간에 놓았을 때의 느낌과 색감 위주. 따뜻한 톤.",
    lengthHint: "100~250자", minChars: 20,
    avoid: ["해시태그 남발", "다른 쇼핑몰 언급"],
    needsBodyProfile: false,
    extras: ["어떤 공간에 어떻게 배치했는지가 핵심 정보다."] },
  { key: "generic", label: "공통(플랫폼 미지정)",
    style: "존댓말 구어체. 무난하고 어디에나 붙일 수 있는 톤.",
    lengthHint: "80~180자", minChars: 20,
    avoid: ["해시태그", "특정 쇼핑몰 언급"],
    needsBodyProfile: false, extras: [] },
];

const PLATFORM_MAP = new Map(PLATFORMS.map(p => [p.key, p]));
export const getPlatform = key => PLATFORM_MAP.get(key) ?? PLATFORM_MAP.get("generic");

export function describePlatform(key) {
  const p = getPlatform(key);
  return [
    `플랫폼: ${p.label}`,
    `- 말투: ${p.style}`,
    `- 분량: ${p.lengthHint} (최소 ${p.minChars}자 이상)`,
    `- 쓰지 말 것: ${p.avoid.join(", ")}`,
    ...p.extras.map(e => `- ${e}`),
  ].join("\n");
}

export const TONES = ["담백", "친근", "상세"];

/** 카테고리에 실제로 관련 있는 프로필 항목만 고른다.
 *  화장품 리뷰에 키·몸무게를 넣으면 모델이 엉뚱하게 끌어다 쓴다. */
export function profileContextLines(profile, categoryKey, needsBody) {
  const cat = getCategory(categoryKey);
  const wears = ["clothing", "sports_outdoor", "baby_kids"].includes(cat.key);
  const shoes = cat.key === "shoes";
  const out = [];
  const push = (cond, val, label, unit = "") => {
    if (cond && val) out.push(`${label}: ${val}${unit}`);
  };
  push(wears || needsBody, profile.height_cm, "키", "cm");
  push(wears || needsBody, profile.weight_kg, "몸무게", "kg");
  push(wears || needsBody, profile.top_size, "평소 상의 사이즈");
  push(wears || needsBody, profile.bottom_size, "평소 하의 사이즈");
  push(shoes, profile.shoe_size, "평소 신발 사이즈", "mm");
  push(cat.key === "beauty", profile.skin_type, "피부 타입");
  push(true, profile.age_range, "연령대");
  return out;
}
