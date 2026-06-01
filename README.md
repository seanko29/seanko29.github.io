# seanko29.github.io

Personal academic homepage of **Donggeun (Sean) Ko** — a clean, static single-page site
(plain HTML + CSS + a little JS, no build step). Served by GitHub Pages with Jekyll disabled
(`.nojekyll`).

Layout: a fixed **left sidebar** (profile + tabs + dark-mode toggle) and a **right content area**
that switches between tabs — modeled on saebyeolshin.github.io.

## Structure

```
index.html              # the whole page (sidebar + About / Publications panels)
assets/css/main.css     # styles + light/dark theme tokens (Inter, minimal theme)
assets/js/main.js       # tab switching + light/dark toggle (persisted in localStorage)
assets/img/uploads/     # profile photo (profile2.jpg)
legacy/                 # the old Jekflix (Jekyll) template, archived
```

## Editing

- **Tabs** — `About` and `Publications`. Each is a `<section class="panel" id="panel-…">` in
  `index.html`; the sidebar `<button class="tab" data-tab="…">` switches between them.
- **About content** — bio, contact chips, Education, Research Experience, Industry Experience.
- **Add an experience** — copy a `<article class="card">…</article>` block. An AiM Future entry is
  pre-written as a comment inside the Industry Experience block — uncomment it to show it.
- **More publications** — inside the `<details>` block at the bottom of the Publications panel.
- **CV** — add your PDF at `assets/Donggeun_Ko_CV.pdf` (the "CV" chip already points there).
- **Dark mode** — default follows the OS setting; the toggle persists the user's choice.

## Local preview

```bash
python -m http.server 4099
# then open http://localhost:4099
```

## Deploy

Push to `main`/`master` — GitHub Pages serves the static files as-is (`.nojekyll` present).
