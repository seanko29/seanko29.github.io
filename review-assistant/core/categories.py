"""상품 카테고리별 '좋은 리뷰가 다루는 축'과 '사진으로는 알 수 없는 것' 정의.

axes        - 그 카테고리 리뷰에서 독자가 실제로 궁금해하는 항목
unknowable  - 사진만 보고는 절대 알 수 없어서, 초안에 단정해서 쓰면 안 되는 항목
              (생성기는 이 항목들을 [대괄호] 자리표시자로 남긴다)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    axes: tuple[str, ...]
    unknowable: tuple[str, ...]


_CATEGORY_LIST: tuple[Category, ...] = (
    Category(
        key="clothing",
        label="의류",
        axes=("사이즈감과 핏", "소재와 두께", "색상(실물 대비)", "봉제/마감 상태", "어떤 상황에 입을지"),
        unknowable=("착용감", "세탁 후 변형", "보온성", "실착 사이즈 적합도"),
    ),
    Category(
        key="shoes",
        label="신발",
        axes=("사이즈(정사이즈/반치수)", "발볼과 착화감", "무게", "쿠션감", "디자인과 색상"),
        unknowable=("장시간 착화감", "내구성", "미끄럼 방지 성능"),
    ),
    Category(
        key="bag_accessory",
        label="가방·잡화",
        axes=("크기와 수납력", "소재와 마감", "무게", "색상", "데일리 활용도"),
        unknowable=("내구성", "장기 사용 시 변형"),
    ),
    Category(
        key="food_delivery",
        label="배달음식",
        axes=("양", "포장 상태", "도착 시 온도", "구성", "가격 대비"),
        unknowable=("맛", "간", "재주문 의사"),
    ),
    Category(
        key="food_product",
        label="식품·신선식품",
        axes=("포장/보냉 상태", "양과 개수", "겉보기 신선도", "구성", "가성비"),
        unknowable=("맛", "식감", "유통기한 만족도", "조리 후 결과"),
    ),
    Category(
        key="beauty",
        label="화장품·뷰티",
        axes=("용기와 용량", "제형과 색", "향(표기 기준)", "사용감", "피부 타입 적합성"),
        unknowable=("발림성", "지속력", "자극 여부", "실제 효과"),
    ),
    Category(
        key="electronics",
        label="전자기기",
        axes=("구성품", "마감과 크기", "설치/연결 편의", "디자인", "소음"),
        unknowable=("성능", "배터리 지속", "발열", "장기 안정성"),
    ),
    Category(
        key="home_living",
        label="생활용품·주방",
        axes=("크기와 용량", "재질과 마감", "실사용 편의", "수납/자리 차지", "가성비"),
        unknowable=("내구성", "세척 편의", "장기 사용감"),
    ),
    Category(
        key="furniture_interior",
        label="가구·인테리어",
        axes=("실제 크기", "색감과 질감", "조립 난이도", "공간과의 조화", "마감 상태"),
        unknowable=("내구성", "흔들림", "장기 사용감"),
    ),
    Category(
        key="baby_kids",
        label="유아·아동",
        axes=("사이즈", "소재와 촉감", "안전 마감", "디자인", "구성"),
        unknowable=("아이 반응", "세탁 내구성", "실착 만족도"),
    ),
    Category(
        key="pet",
        label="반려동물",
        axes=("크기", "소재", "구성", "마감", "가성비"),
        unknowable=("반려동물 반응", "기호성", "내구성"),
    ),
    Category(
        key="sports_outdoor",
        label="스포츠·아웃도어",
        axes=("사이즈", "소재와 무게", "구성품", "마감", "용도 적합성"),
        unknowable=("성능", "착용감", "내구성"),
    ),
    Category(
        key="book_stationery",
        label="도서·문구",
        axes=("상태(배송 중 손상 여부)", "크기와 두께", "지질/인쇄 상태", "구성"),
        unknowable=("내용 만족도", "필기감"),
    ),
    Category(
        key="other",
        label="기타",
        axes=("겉보기 상태", "구성", "크기", "마감", "포장"),
        unknowable=("실사용 성능", "내구성"),
    ),
)

CATEGORIES: dict[str, Category] = {c.key: c for c in _CATEGORY_LIST}
CATEGORY_KEYS: tuple[str, ...] = tuple(CATEGORIES)


def get(key: str) -> Category:
    """알 수 없는 키가 들어와도 죽지 않고 '기타'로 떨어진다."""
    return CATEGORIES.get(key, CATEGORIES["other"])


def describe(key: str) -> str:
    c = get(key)
    return (
        f"카테고리: {c.label}\n"
        f"- 이 카테고리 리뷰에서 독자가 궁금해하는 것: {', '.join(c.axes)}\n"
        f"- 사진만으로는 알 수 없는 것(단정 금지, 자리표시자로 남길 것): {', '.join(c.unknowable)}"
    )


def catalog_for_prompt() -> str:
    return "\n".join(f"- {c.key}: {c.label}" for c in _CATEGORY_LIST)
