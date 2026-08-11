// UI 배선. 상태는 전부 브라우저 안에만 있다(서버 없음).

import { CATEGORIES, PLATFORMS, getCategory, getPlatform } from "./data.js";
import { DEFAULT_EFFORT, DEFAULT_MAX_PX, DEFAULT_MODEL, generate, prepareImage, refine } from "./api.js";

const $ = id => document.getElementById(id);
const STORE = {
  key: "review-assistant.apiKey",
  profile: "review-assistant.profile",
  settings: "review-assistant.settings",
};
const PROFILE_FIELDS = ["height_cm","weight_kg","top_size","bottom_size","shoe_size","skin_type","age_range"];

let file = null;
let lastResult = null;
let lastInputs = null;   // 사진 없이 재생성할 때 쓰는 맥락
let inFlight = null;     // AbortController

// ------------------------------------------------------------ 저장소

const readJSON = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const getKey = () => { try { return localStorage.getItem(STORE.key) || ""; } catch { return ""; } };
const getProfile = () => readJSON(STORE.profile, {});
const getSettings = () => ({ model: DEFAULT_MODEL, maxPx: DEFAULT_MAX_PX, effort: DEFAULT_EFFORT,
                             ...readJSON(STORE.settings, {}) });

// ------------------------------------------------------------ 안전한 렌더링

const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
// 반드시 이스케이프 '후에' 자리표시자를 감쌀 것. 순서를 바꾸면 XSS가 열린다.
const markPlaceholders = s => esc(s).replace(/\[[^\[\]]{1,60}\]/g, m => `<mark>${m}</mark>`);
const charCount = s => [...s].length;

// ------------------------------------------------------------ 초기화

function init() {
  PLATFORMS.forEach(p => $("platform").add(new Option(p.label, p.key)));
  CATEGORIES.forEach(c => $("category").add(new Option(c.label, c.key)));

  const profile = getProfile();
  PROFILE_FIELDS.forEach(f => { if (profile[f]) $(f).value = profile[f]; });

  const s = getSettings();
  $("model").value = s.model;
  $("maxPx").value = s.maxPx;
  $("effort").value = s.effort;

  renderKeyState();
  bind();
}

function renderKeyState() {
  const key = getKey();
  if (key) {
    $("keySet").hidden = false;
    $("keyForm").hidden = true;
    $("keyMasked").textContent = key.slice(0, 11) + "…" + key.slice(-4);
    $("go").disabled = !file;
  } else {
    $("keySet").hidden = true;
    $("keyForm").hidden = false;
    $("go").disabled = true;
  }
}

// ------------------------------------------------------------ 이벤트

function bind() {
  $("saveKey").onclick = () => {
    const v = $("apiKey").value.trim();
    if (!v) return;
    if (!v.startsWith("sk-ant-")) {
      $("keyErr").textContent = "Anthropic API 키는 sk-ant- 로 시작합니다. 다시 확인해 주세요.";
      return;
    }
    $("keyErr").textContent = "";
    try { localStorage.setItem(STORE.key, v); }
    catch { $("keyErr").textContent = "브라우저 저장에 실패했습니다(시크릿 모드?)."; return; }
    $("apiKey").value = "";
    renderKeyState();
  };
  $("apiKey").onkeydown = e => { if (e.key === "Enter") $("saveKey").click(); };

  $("clearKey").onclick = () => {
    if (!confirm("이 브라우저에 저장된 API 키를 삭제할까요?")) return;
    try { localStorage.removeItem(STORE.key); } catch {}
    renderKeyState();
  };

  const drop = $("drop");
  drop.onclick = () => $("file").click();
  $("file").onchange = e => setFile(e.target.files[0]);
  ["dragenter","dragover"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave","drop"].forEach(ev =>
    drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => setFile(e.dataTransfer.files[0]));

  $("saveProfile").onclick = () => {
    const p = {};
    PROFILE_FIELDS.forEach(f => p[f] = $(f).value.trim());
    writeJSON(STORE.profile, p);
    flash($("profileMsg"), "저장했습니다.");
  };

  $("saveSettings").onclick = () => {
    const px = Number($("maxPx").value);
    writeJSON(STORE.settings, {
      model: $("model").value || DEFAULT_MODEL,
      maxPx: Number.isFinite(px) ? px : DEFAULT_MAX_PX,
      effort: $("effort").value || DEFAULT_EFFORT,
    });
    flash($("settingsMsg"), "저장했습니다.");
  };

  $("go").onclick = runGenerate;
  $("cancel").onclick = () => inFlight?.abort();
}

function flash(el, msg) {
  el.textContent = " " + msg;
  setTimeout(() => el.textContent = "", 2200);
}

function setFile(f) {
  if (!f) return;
  if (f.size > 25 * 1024 * 1024) {
    showError("사진이 너무 큽니다(25MB 초과).");
    return;
  }
  file = f;
  $("go").disabled = !getKey();
  const url = URL.createObjectURL(f);
  const img = $("preview");
  img.onload = () => { $("dropText").hidden = true; img.hidden = false; URL.revokeObjectURL(url); };
  img.onerror = () => {
    // HEIC 등 브라우저가 미리보기를 못 그리는 형식. 업로드 자체는 시도해 본다.
    $("dropText").innerHTML = `선택됨: ${esc(f.name)}<br><small>미리보기를 지원하지 않는 형식입니다</small>`;
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

// ------------------------------------------------------------ 실행

async function runGenerate() {
  if (!file) return;
  const settings = getSettings();
  const platformKey = $("platform").value;
  const categoryKey = $("category").value || null;
  const note = $("note").value;

  await run(async signal => {
    const image = await prepareImage(file, settings.maxPx);
    const result = await generate({
      apiKey: getKey(), model: settings.model, effort: settings.effort, image,
      platformKey, categoryKey, profile: getProfile(), note, signal,
    });
    lastInputs = { observed: result.observed, categoryKey: result.category, note };
    return result;
  });
}

async function runRespin(platformKey) {
  if (!lastInputs) return;
  const settings = getSettings();
  await run(signal => refine({
    apiKey: getKey(), model: settings.model, effort: settings.effort,
    observed: lastInputs.observed, platformKey,
    categoryKey: lastInputs.categoryKey, profile: getProfile(),
    note: lastInputs.note, signal,
  }));
}

async function run(task) {
  const btn = $("go");
  inFlight = new AbortController();
  btn.disabled = true;
  btn.innerHTML = '<span class="spin"></span>만드는 중… (10~30초)';
  $("cancel").hidden = false;
  try {
    lastResult = await task(inFlight.signal);
    render(lastResult);
  } catch (err) {
    if (err.name === "AbortError") showError("취소했습니다.");
    else showError(err.message || String(err));
  } finally {
    inFlight = null;
    btn.disabled = !file || !getKey();
    btn.textContent = "초안 만들기";
    $("cancel").hidden = true;
  }
}

const showError = msg =>
  $("out").innerHTML = `<div class="err"><b>실패했습니다.</b><br>${esc(msg)}</div>`;

// ------------------------------------------------------------ 결과 렌더링

function render(d) {
  const platform = getPlatform($("platform").value);
  const drafts = d.drafts.map((dr, i) => {
    const n = charCount(dr.text);
    const short = n < platform.minChars;
    return `<div class="draft">
      <div class="draft-head">
        <span class="tone">${esc(dr.tone)}</span>
        <span class="count${short ? " short" : ""}">${n}자${short ? " · 너무 짧습니다" : ""}</span>
        <button class="ghost" data-copy="${i}">복사</button>
      </div>
      <div class="body">${markPlaceholders(dr.text)}</div>
    </div>`;
  }).join("");

  const usage = d.usage
    ? `<p class="usage">입력 ${d.usage.input_tokens?.toLocaleString() ?? "?"} · 출력 ${d.usage.output_tokens?.toLocaleString() ?? "?"} 토큰</p>`
    : "";

  $("out").innerHTML = `
    <div class="facts">
      <h3>사진에서 확인된 것 — ${esc(d.product_guess)} (${esc(getCategory(d.category).label)})</h3>
      <ul>${d.observed.map(o => `<li>${esc(o)}</li>`).join("")}</ul>
    </div>
    ${d.caution?.length ? `<div class="facts caution">
      <h3>올리기 전에 확인하세요</h3>
      <ul>${d.caution.map(c => `<li>${esc(c)}</li>`).join("")}</ul>
    </div>` : ""}
    <div class="respin">
      <span>다른 플랫폼용으로 다시 만들기</span>
      <select id="respinPick"></select>
      <button class="ghost" id="respinGo">다시 만들기</button>
    </div>
    ${drafts}${usage}
    <p class="note">초안은 그대로 올리는 용도가 아닙니다.
      <mark>[표시된 부분]</mark>을 본인 경험으로 채우고, 사실과 다른 문장은 고친 뒤 올리세요.</p>`;

  const pick = $("respinPick");
  PLATFORMS.forEach(p => pick.add(new Option(p.label, p.key)));
  pick.value = $("platform").value;
  $("respinGo").onclick = () => {
    $("platform").value = pick.value;   // 글자 수 기준도 함께 바뀌도록
    runRespin(pick.value);
  };

  $("out").querySelectorAll("[data-copy]").forEach(b => {
    b.onclick = async () => {
      const text = lastResult.drafts[Number(b.dataset.copy)].text;
      try { await navigator.clipboard.writeText(text); }
      catch { showError("클립보드 복사가 차단되었습니다. 직접 선택해서 복사해 주세요."); return; }
      const original = b.textContent;
      b.textContent = "복사됨";
      setTimeout(() => b.textContent = original, 1500);
    };
  });
}

init();
