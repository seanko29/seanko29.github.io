#!/usr/bin/env bash
# 이 폴더를 독립 저장소로 분리해 새 GitHub repo에 올린다.
#
#   1) GitHub에서 빈 저장소를 먼저 만든다 (README 체크 해제)
#      https://github.com/new  →  이름: review-assistant  →  Public
#   2) ./publish.sh https://github.com/<사용자명>/review-assistant.git
#
set -euo pipefail

REMOTE="${1:-}"
if [ -z "$REMOTE" ]; then
  echo "사용법: ./publish.sh <새 저장소 URL>"
  echo "예시:   ./publish.sh https://github.com/seanko29/review-assistant.git"
  exit 1
fi

SRC="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cp -R "$SRC"/. "$TMP"/
cd "$TMP"
rm -rf .git .venv venv
find . -name __pycache__ -type d -prune -exec rm -rf {} + 2>/dev/null || true
find . -name '.env' -delete 2>/dev/null || true   # 키가 딸려 올라가지 않도록

git init -q -b main
git add -A
if git diff --cached --name-only | grep -qE '(^|/)\.env$'; then
  echo "중단: .env 가 포함되었습니다. 확인이 필요합니다."
  exit 1
fi
git commit -q -m "리뷰 초안 생성기: 사진 한 장으로 쇼핑몰 리뷰 초안 만들기"
git branch -M main
git remote add origin "$REMOTE"
git push -u origin main

cat <<'DONE'

푸시 완료.

다음 단계 — GitHub Pages 켜기:
  저장소 → Settings → Pages
  Source: Deploy from a branch
  Branch: main   폴더: /docs   → Save

1~2분 뒤 https://<사용자명>.github.io/review-assistant/ 에서 열립니다.
DONE
