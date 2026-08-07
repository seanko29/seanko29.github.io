# 이 폴더를 독립 저장소로 분리해 새 GitHub 저장소에 올린다. (Windows PowerShell)
#
#   1) GitHub에서 빈 저장소를 먼저 만든다 (README 체크 해제)
#      https://github.com/new  ->  이름: review-assistant  ->  Public
#   2) PowerShell에서:
#        .\publish.ps1 https://github.com/<사용자명>/review-assistant.git
#
param(
    [Parameter(Mandatory = $true, HelpMessage = "새로 만든 빈 저장소의 URL")]
    [string]$RemoteUrl
)

$ErrorActionPreference = 'Stop'

function Assert-Ok([string]$What) {
    if ($LASTEXITCODE -ne 0) { throw "$What 실패 (종료 코드 $LASTEXITCODE)" }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw "git 이 설치되어 있지 않습니다. https://git-scm.com/download/win 에서 설치하세요."
}

$src = $PSScriptRoot
$tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("ra-" + [guid]::NewGuid().ToString('N').Substring(0, 8))

try {
    Copy-Item -Path $src -Destination $tmp -Recurse

    # 원본 저장소 이력과 로컬 부산물, 그리고 키가 든 .env 는 가져가지 않는다.
    foreach ($junk in @('.git', '.venv', 'venv', '.env')) {
        $p = Join-Path $tmp $junk
        if (Test-Path $p) { Remove-Item $p -Recurse -Force }
    }
    Get-ChildItem -Path $tmp -Filter '__pycache__' -Recurse -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item $_.FullName -Recurse -Force }

    Push-Location $tmp

    git init -q;                                          Assert-Ok 'git init'
    git checkout -q -b main;                              Assert-Ok 'git checkout -b main'
    git add -A;                                           Assert-Ok 'git add'

    $staged = git diff --cached --name-only
    if ($staged | Where-Object { $_ -match '(^|/)\.env$' }) {
        throw "중단: .env 가 포함되었습니다. API 키가 올라갈 뻔했습니다."
    }

    git commit -q -m "리뷰 초안 생성기: 사진 한 장으로 쇼핑몰 리뷰 초안 만들기"
    Assert-Ok 'git commit'
    git remote add origin $RemoteUrl;                      Assert-Ok 'git remote add'
    git push -u origin main;                              Assert-Ok 'git push'

    Write-Host ""
    Write-Host "푸시 완료." -ForegroundColor Green
    Write-Host ""
    Write-Host "다음 단계 - GitHub Pages 켜기:"
    Write-Host "  저장소 -> Settings -> Pages"
    Write-Host "  Source: Deploy from a branch"
    Write-Host "  Branch: main   폴더: /docs   -> Save"
    Write-Host ""
    Write-Host "1~2분 뒤 https://<사용자명>.github.io/review-assistant/ 에서 열립니다."
}
finally {
    Pop-Location -ErrorAction SilentlyContinue
    if (Test-Path $tmp) { Remove-Item $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}
