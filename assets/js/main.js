(function () {
  "use strict";

  /* ---- Year ---- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---- Tabs ---- */
  var tabsWrap = document.getElementById("tabs");
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tab"));
  var panels = Array.prototype.slice.call(document.querySelectorAll(".panel"));

  function activate(name, push) {
    var found = false;
    tabs.forEach(function (t) {
      var on = t.getAttribute("data-tab") === name;
      t.classList.toggle("is-active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
      if (on) found = true;
    });
    if (!found) return;
    panels.forEach(function (p) {
      p.hidden = p.id !== "panel-" + name;
    });
    if (push && history.replaceState) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "auto" });
  }

  if (tabsWrap) {
    tabsWrap.addEventListener("click", function (e) {
      var btn = e.target.closest(".tab");
      if (btn) activate(btn.getAttribute("data-tab"), true);
    });
  }

  // Honor #hash on load (e.g. /#publications)
  var initial = (location.hash || "").replace("#", "");
  if (initial) activate(initial, false);

  /* ---- Theme toggle ---- */
  var toggle = document.getElementById("themeToggle");
  var label = toggle && toggle.querySelector(".theme-toggle__label");

  function syncLabel() {
    if (!label) return;
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    label.textContent = dark ? "Light mode" : "Dark mode";
  }
  syncLabel();

  if (toggle) {
    toggle.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      var next = cur === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncLabel();
    });
  }
})();
