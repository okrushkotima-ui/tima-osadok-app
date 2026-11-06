"use strict";
const C = RitmCore,
  { ideas, categories } = RitmCatalog,
  $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const labels = {
  idea: "Идея",
  shot: "Снято",
  editing: "Монтаж",
  ready: "Готово",
  published: "Опубликовано",
  skipped: "Пропущено",
};
const platforms = ["TikTok", "Instagram Reels", "YouTube Shorts", "VK Клипы"];
const ageNames = {
  2: "2 часа",
  24: "24 часа",
  48: "48 часов (старые)",
  168: "7 дней",
  legacy: "Возраст неизвестен (старые)",
};
const metricLabels = {
  views: "Просмотры",
  likes: "Лайки",
  comments: "Комментарии",
  shares: "Репосты",
  saves: "Сохранения",
  followers: "Подписки с ролика",
  watch: "Среднее время, сек",
  retention: "Средний % просмотра",
  chosen: "Выбрали просмотр, %",
  completion: "Досмотрели, %",
};
const fmt = (d, opts = { day: "numeric", month: "long" }) =>
  new Date(d + "T12:00Z").toLocaleDateString("ru-RU", opts);
const opts = (xs, v) =>
  xs
    .map((x) => {
      const [k, t] = Array.isArray(x) ? x : [x, x];
      return `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(t)}</option>`;
    })
    .join("");
const field = (name, label, value = "", type = "text", extra = "") =>
  `<label>${label}<input name="${name}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const area = (name, label, value) =>
  `<label>${label}<textarea name="${name}" maxlength="10000">${esc(value)}</textarea></label>`;
let storage;
try {
  storage = window.localStorage;
} catch {
  storage = {
    getItem() {
      throw Error("Хранилище недоступно");
    },
    setItem() {
      throw Error("Хранилище недоступно");
    },
  };
}
const loaded = C.load(storage, ideas);
let state = loaded.state,
  blocked = !!loaded.blocked,
  date = C.today(),
  tab = "today",
  low = false,
  calendar = 14;
let filters = {
  q: "",
  category: "",
  effort: "",
  location: "",
  face: "",
  music: "",
  props: "",
  scope: "",
};
let report = {
  period: 7,
  platform: platforms[0],
  age: "24",
  metric: "views",
  group: "category",
  mode: "Органика",
};
let activeTask = null,
  trendEdit = null,
  toastTimer;
function notice(message) {
  $("#storageNotice").innerHTML = message
    ? `<div class="tip warning">${esc(message)} <button id="rawExport">Скачать исходные данные</button></div>`
    : "";
}
if (loaded.message) notice(loaded.message);
function toast(s) {
  $("#toast").textContent = s;
  $("#toast").style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("#toast").style.display = "none"), 3500);
}
function save() {
  if (blocked) {
    notice(
      "Автосохранение остановлено: сначала скачай исходные данные. Затем восстанови проверенную копию или сбрось повреждённую версию в настройках.",
    );
    return false;
  }
  const r = C.persist(storage, state, ideas);
  if (!r.ok) {
    notice(
      "Не удалось сохранить: " +
        r.error +
        ". Изменения доступны в памяти вкладки — экспортируй копию.",
    );
    return false;
  }
  return true;
}
function finish(message) {
  const saved = save();
  close();
  render();
  if (message)
    toast(
      saved
        ? message
        : "Изменения только в памяти. Экспортируй JSON до закрытия вкладки.",
    );
}
function records() {
  const exists = !!state.days[date];
  const rs = C.ensureDay(state, date, ideas);
  const fixed = C.alignFocusDay(state, date, ideas);
  if (!exists || fixed) save();
  return rs;
}
function allTasks() {
  return [
    ...Object.entries(state.days).flatMap(([d, rs]) =>
      rs.map((r) => ({ d, r })),
    ),
    ...state.queue.map((r) => ({ d: "queue", r })),
  ];
}
function find(id) {
  return allTasks().find((x) => x.r.id === id);
}
function open(html) {
  $("#modalBody").innerHTML = html;
  const heading = $("#modalBody").querySelector("h2");
  if (heading) heading.id = "modalTitle";
  if (!$("#modal").open) $("#modal").showModal();
}
function close() {
  $("#modal").close();
}
$(".close").onclick = close;
$("#modal").addEventListener("click", (e) => {
  if (e.target === $("#modal")) close();
});
function dates() {
  const start = C.shift(date, -3);
  $("#dates").innerHTML =
    `<button data-date="${C.shift(date, -7)}" aria-label="Неделя назад">‹</button>` +
    Array.from({ length: 7 }, (_, i) => {
      const d = C.shift(start, i);
      return `<button data-date="${d}" class="${d === date ? "selected" : ""}" ${d === date ? 'aria-current="date"' : ""}><span>${fmt(d, { weekday: "short" })}</span><b>${fmt(d, { day: "numeric" })}</b></button>`;
    }).join("") +
    `<button data-date="${C.shift(date, 7)}" aria-label="Неделя вперёд">›</button>`;
}
function fullBrief(f) {
  return `${f.title}\n${categories[f.category]} · ${f.duration} сек · ${f.effort} мин · ${f.location}\nPOV: ${f.pov}\nПервые слова: ${f.hook}\nРеплики и действия: ${f.script}\n${f.shots.map((s) => s.time + " сек: " + s.text).join("\n")}\nРакурс и свет: ${f.setup}\nРеквизит: ${f.props}\nЗвук: ${f.sound}\nМонтаж: ${f.edit}\nПодпись: ${f.caption}\nCTA: ${f.cta}\n${f.tags}\nЦель: ${f.goal}\nПубликация: ${f.publish}\nТрек дня: ${state.dayMeta[date]?.track || state.track || "по выбору"}`;
}
async function copy(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      toast("Скопировано");
      return;
    }
  } catch {}
  open(
    `<h2>Скопируй текст</h2><p>Браузер не разрешил быстрый доступ. Выдели текст и скопируй.</p><textarea id="copyFallback" readonly>${esc(text)}</textarea>`,
  );
  $("#copyFallback").select();
}
function card(r, i) {
  const f = C.brief(r, ideas),
    id = esc(r.id),
    next = {
      idea: "Снять первый дубль",
      shot: "Перейти к монтажу",
      editing: "Проверить готовый ролик",
      ready: "Выложить вручную",
      published: "Внести замер",
      skipped: "Можно вернуться позже",
    }[r.status];
  return `<article class="card ${r.status === "published" ? "done" : ""}"><div class="num">${String(i + 1).padStart(2, "0")} <span>${esc(r.time)} МСК · ${labels[r.status]}</span></div><div class="card-top"><span class="pill">${categories[f.category]}</span><button data-fav="${f.id}" aria-label="${state.favorites.includes(f.id) ? "Убрать из избранного" : "В избранное"}" aria-pressed="${state.favorites.includes(f.id)}">${state.favorites.includes(f.id) ? "★" : "☆"}</button></div><h3>${esc(f.title)}</h3>${f.growthTrack ? `<div class="focus-track-name">♫ ${esc(RitmGrowth.tracks.find(t => t[0] === f.growthTrack)?.[1] || "Мой трек")}</div>` : ""}<div class="meta">${f.duration} сек · ${f.effort} мин · ${f.face ? "с лицом" : "без лица"} · ${esc(f.location)}</div><div class="copy-block"><small>POV НА ЭКРАН</small><p>${esc(f.pov)}</p><button data-copy="pov" data-id="${id}">Копировать POV</button></div><details><summary>Подпись · один тап</summary><p>${esc(f.caption)}</p><p>${esc(f.tags)}</p><button data-copy="caption" data-id="${id}">Копировать подпись</button></details><p class="next">Дальше: ${next}</p><div class="actions"><button class="primary" data-scenario="${id}">Сценарий ↗</button><button data-replace="${id}">Другая идея</button></div><div class="stage-actions"><button class="${r.status === "idea" ? "next-stage" : ""}" data-stage="shot" data-id="${id}">Снял</button><button class="${["shot", "editing"].includes(r.status) ? "next-stage" : ""}" data-stage="ready" data-id="${id}">Смонтировал</button><button class="${r.status === "ready" ? "next-stage" : ""}" data-publish="${id}">Опубликовал</button><button class="${r.status === "published" ? "next-stage" : ""}" data-metrics="${id}">Результат</button></div><label class="sr-only" for="status-${id}">Этап ${esc(f.title)}</label><select id="status-${id}" data-status="${id}">${opts(Object.entries(labels), r.status)}</select><div class="actions subtle"><button data-move="${id}">Перенести / время</button><button data-stage="skipped" data-id="${id}">Пропустить</button>${r.history.length ? `<button data-undo="${id}">Отменить замену</button>` : ""}</div></article>`;
}
function render() {
  dates();
  document.querySelectorAll("[data-tab]").forEach((b) => {
    b.classList.toggle("active", b.dataset.tab === tab);
    if (b.dataset.tab === tab) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (tab === "today") renderToday();
  if (tab === "plan") renderPlan();
  if (tab === "ideas") renderIdeas();
  if (tab === "trends") renderTrends();
  if (tab === "stats") renderStats();
  if (tab === "growth") $("#app").innerHTML = RitmGrowth.render({ date, state });
}
function renderToday() {
  const rs = records(),
    done = rs.filter((x) => x.status === "published").length,
    visible = low
      ? [...rs]
          .filter((x) => !["published", "skipped"].includes(x.status))
          .sort((a, b) => C.brief(a, ideas).effort - C.brief(b, ideas).effort)
          .slice(0, 2)
      : rs;
  $("#app").innerHTML =
    `<section class="panel hero"><span class="eyebrow">ТВОЯ МУЗЫКА · ТВОЙ ОБРАЗ</span><div class="heading"><h1>${low ? "Сегодня без перегруза" : "Снимай так, чтобы запомнили тебя"}</h1><span class="pill">${fmt(date)}</span></div><p>Харизма, любовь, взгляд в камеру и твои треки. Никаких случайных заданий — только наша стратегия.</p><div class="progress" aria-label="Готово ${done} из ${rs.length}"><i style="width:${rs.length ? (done / rs.length) * 100 : 0}%"></i></div><div class="heading"><b>Готово ${done} из ${rs.length}</b><span class="meta">${rs.filter((x) => x.status === "skipped").length} пропущено · без штрафов</span></div><div class="actions wrap"><button id="low" class="${low ? "primary" : ""}">${low ? "Вернуть полный план" : "Сегодня мало сил"}</button><button id="dayMeta">Тема / трек дня</button><button id="refreshDay">Другие фокусные идеи ↻</button><button data-tab="plan">Очередь · ${state.queue.length}</button><button data-tab="growth">♡ Фокус артиста</button></div>${low ? "<p>Показаны два самых простых незавершённых задания. Основной план сохранён.</p>" : ""}${state.dayMeta[date]?.theme ? `<div class="tip">Тема: ${esc(state.dayMeta[date].theme)} · Трек: ${esc(state.dayMeta[date].track || "по выбору")}</div>` : ""}</section><div class="heading section-title"><h2>Выбери ближайший шаг</h2><span class="meta">МСК · UTC+3</span></div><div class="cards">${visible.map(card).join("") || '<section class="panel empty">На этот день задач больше нет. Можно отдохнуть или добавить идею из библиотеки.</section>'}</div><div class="tip">Время — твой ориентир, а не «магические часы». Выложи на выбранной площадке вручную, затем сохрани ссылку и результат.</div>`;
}
function renderPlan() {
  const days = Array.from({ length: calendar }, (_, i) => C.shift(date, i));
  $("#app").innerHTML =
    `<section class="panel"><span class="eyebrow">ПЛАН БЕЗ ГОНКИ</span><h1>Собери удобный темп</h1><div class="actions wrap"><button data-calendar="14" class="${calendar === 14 ? "primary" : ""}">14 дней</button><button data-calendar="30" class="${calendar === 30 ? "primary" : ""}">30 дней</button><button id="fillPlan">Заполнить пустые дни</button><button id="dayMeta">Тема выбранного дня</button></div><p>Будущие дни создаются по запросу. Публикации и пропуски остаются в истории.</p><div class="calendar">${days
      .map((d) => {
        const rs = state.days[d];
        return `<button data-select="${d}" class="calendar-day ${d === date ? "selected" : ""}"><b>${fmt(d, { day: "numeric", month: "short" })}</b><small>${rs ? rs.filter((r) => r.status === "published").length + " выложено · " + rs.length + " задач" : "Свободный день"}</small></button>`;
      })
      .join(
        "",
      )}</div></section><section class="panel"><h2>Пакетная работа</h2><p>Задачи до ${fmt(C.shift(date, calendar - 1))}. Открывай сценарий, меняй этап или переноси в удобный день.</p>${[
      ["Снять пакетно", ["idea"]],
      ["Смонтировать", ["shot", "editing"]],
      ["Выложить", ["ready"]],
    ]
      .map(
        ([title, ss]) =>
          `<details open><summary>${title}</summary>${
            allTasks()
              .filter(
                (x) =>
                  x.d !== "queue" &&
                  x.d >= date &&
                  x.d <= days.at(-1) &&
                  ss.includes(x.r.status),
              )
              .map((x) => compact(x))
              .join("") || "<p>Здесь пока свободно.</p>"
          }</details>`,
      )
      .join(
        "",
      )}</section><section class="panel"><h2>Очередь · ${state.queue.length}</h2><p>Отложенные идеи и отснятые ролики. Этапы и замеры сохраняются при переносе.</p>${state.queue.map((r) => compact({ d: "queue", r })).join("") || '<div class="empty">Сохрани сюда идею из библиотеки или перенеси карточку дня.</div>'}</section>`;
}
function compact({ d, r }) {
  const f = C.brief(r, ideas);
  return `<div class="task-row"><div><b>${esc(f.title)}</b><small>${d === "queue" ? "Очередь" : fmt(d)} · ${labels[r.status]}</small></div><div class="actions wrap"><button data-scenario="${r.id}">Сценарий</button><button data-move="${r.id}">Назначить</button><select data-status="${r.id}" aria-label="Этап ${esc(f.title)}">${opts(Object.entries(labels), r.status)}</select></div></div>`;
}
function matchedIdeas() {
  return ideas.filter(
    (f) =>
      (!filters.q ||
        (f.title + " " + f.pov + " " + f.script)
          .toLowerCase()
          .includes(filters.q.toLowerCase())) &&
      (!filters.category || f.category === filters.category) &&
      (!filters.effort || f.effort === +filters.effort) &&
      (!filters.location || f.location === filters.location) &&
      (!filters.face || (filters.face === "no" ? !f.face : f.face)) &&
      (!filters.music || f.music === filters.music) &&
      (!filters.props || f.props === filters.props) &&
      (!filters.scope ||
        (filters.scope === "favorites"
          ? state.favorites.includes(f.id)
          : state.queue.some((r) => r.ideaId === f.id))),
  );
}
function renderIdeas() {
  const list = matchedIdeas();
  $("#app").innerHTML =
    `<section class="panel"><span class="eyebrow">${ideas.length} ГОТОВЫХ СЦЕНАРИЕВ · ОФЛАЙН</span><h1>Не придумывай с нуля</h1><label>Поиск<input id="search" value="${esc(filters.q)}" placeholder="Кружка, голос, камера…" type="search"></label><div class="filters-grid">${[
      ["category", "Категория", Object.entries(categories)],
      [
        "effort",
        "Усилие",
        [
          [5, "5 минут"],
          [15, "15 минут"],
          [30, "30 минут"],
        ],
      ],
      ["location", "Место", ["дом", "студия", "улица"]],
      [
        "face",
        "Лицо",
        [
          ["no", "Без лица"],
          ["yes", "С лицом"],
        ],
      ],
      ["music", "Музыка", [...new Set(ideas.map((x) => x.music))]],
      ["props", "Реквизит", [...new Set(ideas.map((x) => x.props))]],
      [
        "scope",
        "Сохранённое",
        [
          ["favorites", "Избранное"],
          ["queue", "В очереди"],
        ],
      ],
    ]
      .map(
        ([k, l, xs]) =>
          `<label>${l}<select data-filter="${k}"><option value="">Все</option>${opts(xs, filters[k])}</select></label>`,
      )
      .join(
        "",
      )}</div><div class="actions wrap"><button id="resetFilters">Сбросить фильтры</button><button id="generator">Варианты POV / хуков</button></div><p id="found">Найдено: ${list.length}</p></section><div class="cards" id="ideaCards">${list.map(ideaCard).join("") || '<section class="panel empty">Подходящих идей нет. Убери один из фильтров.</section>'}</div>`;
}
function ideaCard(f) {
  return `<article class="card"><div class="card-top"><span class="pill">${categories[f.category]}</span><button data-fav="${f.id}" aria-pressed="${state.favorites.includes(f.id)}" aria-label="Избранное: ${esc(f.title)}">${state.favorites.includes(f.id) ? "★" : "☆"}</button></div><h3>${esc(f.title)}</h3><p>${esc(f.pov)}</p><div class="meta">${f.effort} мин · ${f.duration} сек · ${f.location} · ${f.face ? "с лицом" : "без лица"}<br>Реквизит: ${esc(f.props)}</div><div class="actions wrap"><button data-idea="${f.id}" class="primary">Сценарий</button><button data-add="${f.id}">В день / очередь</button></div></article>`;
}
function scenario(r, f) {
  activeTask = r?.id || null;
  f = f || C.brief(r, ideas);
  const id = r?.id;
  open(
    `<span class="eyebrow">${categories[f.category]} · ${f.duration} СЕК</span><h2>${esc(f.title)}</h2><p>${f.effort} мин · ${f.location} · реквизит: ${esc(f.props)}</p><div class="copy-block"><small>POV</small><p>${esc(f.pov)}</p><button data-briefcopy="pov" data-idea-id="${f.id}">Копировать POV</button></div><h3>Первые 2 секунды</h3><p>${esc(f.hook)}</p><button data-briefcopy="hook" data-idea-id="${f.id}">Копировать хук</button><h3>Реплики и действия</h3><p>${esc(f.script)}</p>${f.shots.map((s) => `<div class="shot"><b>${esc(s.time)} сек</b><span>${esc(s.text)}</span></div>`).join("")}<h3>Камера и свет</h3><p>${esc(f.setup)}</p><h3>Звук</h3><p>${esc(f.sound)}</p><h3>Монтаж</h3><p>${esc(f.edit)}</p><div class="copy-block"><small>ПОДПИСЬ И CTA</small><p>${esc(f.caption)}</p><p>${esc(f.cta)}</p><p>${esc(f.tags)}</p><button data-briefcopy="caption" data-idea-id="${f.id}">Копировать подпись</button><button data-briefcopy="tags" data-idea-id="${f.id}">Теги</button></div><p>Цель: ${esc(f.goal)}</p><p>${esc(f.publish)}</p><div class="actions wrap"><button class="primary" data-briefcopy="full" data-idea-id="${f.id}">Копировать полное ТЗ</button>${id ? `<button data-edit="${id}">Редактировать тексты</button>` : `<button data-add="${f.id}">Добавить</button>`}</div>${id ? `<h3>Чек-лист</h3>${["Подготовить свет, реквизит и звук", "Снять и выбрать дубль", "Смонтировать, проверить титры и громкость", "Выложить вручную, сохранить ссылку"].map((x, i) => `<label class="checkline"><input type="checkbox" data-check="${id}" data-step="${i}" ${r.checks.includes(i) ? "checked" : ""}>${x}</label>`).join("")}` : ""}`,
  );
}
function editTask(r) {
  const f = C.brief(r, ideas);
  open(
    `<h2>Тексты этого задания</h2><p>Изменения сохраняются только в выбранной карточке.</p><form id="editForm" data-id="${r.id}">${[
      ["pov", "POV"],
      ["hook", "Первые слова"],
      ["script", "Реплики и действия"],
      ["setup", "Ракурс и свет"],
      ["edit", "Монтаж"],
      ["sound", "Звук"],
      ["caption", "Подпись"],
      ["cta", "CTA"],
      ["tags", "Хештеги"],
      ["publish", "Публикация"],
    ]
      .map(([k, l]) => area(k, l, f[k]))
      .join("")}<button class="primary wide">Сохранить тексты</button></form>`,
  );
}
function replacement(r) {
  if (
    r.status !== "idea" ||
    r.checks.length ||
    Object.keys(r.metrics).length ||
    Object.keys(r.publications).length
  ) {
    toast(
      "Этапы и результаты сохранены. Добавь новую идею или перенеси эту в очередь.",
    );
    return;
  }
  open(
    `<h2>Другой вариант</h2><p>Выбери ограничение. Прежний сценарий можно вернуть кнопкой «Отменить замену».</p><div class="replace-grid">${[
      ["same", "Тот же формат"],
      ["other", "Другая категория"],
      ["simpler", "Проще"],
      ["faster", "Быстрее"],
      ["faceless", "Без лица"],
      ["trend", "POV / механика"],
      ["track", "Под мой трек"],
    ]
      .map(
        ([k, l]) => `<button data-swap="${k}" data-id="${r.id}">${l}</button>`,
      )
      .join("")}</div>`,
  );
}
function moveForm(r) {
  const x = find(r.id);
  open(
    `<h2>Назначить задачу</h2><form id="moveForm" data-id="${r.id}"><label>Куда<select name="target"><option value="day">В выбранный день</option><option value="tomorrow">На завтра</option><option value="queue">В очередь</option></select></label>${field("date", "День", x.d === "queue" ? date : x.d, "date", "required")}${field("time", "Время · МСК", r.time, "time", "required")}<button class="primary wide">Перенести с сохранением этапов</button></form>`,
  );
}
function addForm(id) {
  open(
    `<h2>Добавить идею</h2><p>${esc(ideas.find((x) => x.id === id).title)}</p><form id="addForm" data-idea="${id}"><label>Куда<select name="target"><option value="day">В день</option><option value="queue">В очередь</option></select></label>${field("date", "Дата", date, "date", "required")}${field("time", "Время · МСК", "18:00", "time", "required")}<button class="primary wide">Добавить</button></form>`,
  );
}
function publication(r, p = platforms[0]) {
  const pub = r.publications[p] || {},
    at = pub.at
      ? new Date(Date.parse(pub.at) + 3 * 3600000).toISOString().slice(0, 16)
      : date + "T" + r.time;
  open(
    `<h2>Публикация</h2><p>Сначала выложи ролик вручную. Ссылка и время сохраняются отдельно для каждой площадки.</p><form id="publishForm" data-id="${r.id}"><label>Площадка<select name="platform" id="pubPlatform">${opts(platforms, p)}</select></label>${field("url", "Ссылка (можно позже)", pub.url || "", "url", 'placeholder="https://…"')}${field("at", "Дата и время · МСК (UTC+3)", at, "datetime-local", "required")}<button class="primary wide">Отметить опубликованным</button></form>`,
  );
}
function metrics(r, p = platforms[0], age = "24") {
  activeTask = r.id;
  const m =
    age === "legacy"
      ? C.unknownAge(r.metrics[p]) || {}
      : r.metrics[p]?.snapshots?.[age] || {};
  open(
    `<h2>Результат ролика</h2><p>Ручной ввод. Пусто — нет данных, 0 — настоящий ноль. Сравнивай одинаковый возраст и площадку.</p><form id="metricsForm" data-id="${r.id}"><div class="form-grid"><label>Площадка<select name="platform" id="metricPlatform">${opts(platforms, p)}</select></label><label>Возраст<select name="age" id="metricAge">${opts(Object.entries(ageNames), age)}</select></label></div><label>Режим<select name="mode">${opts(["Органика", "Пробный Reels", "Реклама"], m.mode || "Органика")}</select></label>${field("url", "Ссылка на ролик", m.url || r.publications[p]?.url || "", "url")}${field("at", "Время замера · МСК", m.measuredAt ? new Date(Date.parse(m.measuredAt) + 3 * 3600000).toISOString().slice(0, 16) : new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 16), "datetime-local", "required")}<div class="form-grid">${C.metricsKeys.map((k) => field(k, metricLabels[k], m[k] ?? "", "number", `min="0" ${["chosen", "completion"].includes(k) ? 'max="100"' : ""} step="${["watch", "retention", "chosen", "completion"].includes(k) ? "0.1" : "1"}"`)).join("")}</div>${area("note", "Наблюдение", m.note || "")}<p>Средний процент просмотра может превышать 100 при повторах. Недоступные показатели оставь пустыми.</p><button class="primary wide">Сохранить замер</button></form>`,
  );
}
function settings() {
  open(
    `<span class="eyebrow">ТВОЙ РАБОЧИЙ РИТМ</span><h2>Настройки и копии</h2><form id="settingsForm">${field("track", "Трек по умолчанию", state.track)}${area("hook", "Сохранённая ключевая строка (из прежней версии)", state.hook)}${field("count", "Заданий в новых днях · 1–8", state.settings.count, "number", 'min="1" max="8" required')}<p>Количество применяется к новым дням. Уже созданные карточки сохраняются.</p><label class="checkline"><input name="apply" type="checkbox">Также изменить число в выбранном дне (только нетронутые карточки)</label><h3>Слоты · МСК / Europe/Moscow</h3><div class="form-grid">${state.settings.times.map((t, i) => field("time" + i, "Слот " + (i + 1), t, "time", "required")).join("")}</div><h3>Категории новых заданий</h3>${Object.entries(
      categories,
    )
      .map(
        ([k, l]) =>
          `<label class="checkline"><input type="checkbox" name="category" value="${k}" ${state.settings.categories.includes(k) ? "checked" : ""}>${l}</label>`,
      )
      .join(
        "",
      )}<button class="primary wide">Сохранить настройки</button></form><h3>Сохранность</h3><p>Данные в этом браузере. Между устройствами переноси JSON вручную. Автопубликации и живой ленты трендов нет.</p><div class="actions wrap"><button id="export">Экспорт JSON</button><button id="rawExport">Исходники / бэкапы</button></div><label>Импорт копии (заменит текущую после проверки)<input type="file" id="import" accept="application/json,.json"></label><p>Перед импортом скачай копию. Поддерживается v2 и старая ritm-snippets-v1.</p><button id="reset" class="danger">Начать заново</button><p>Offline станет доступен после первого открытия с сетью. </p>`,
  );
}
function generator() {
  open(
    `<h2>Варианты POV и хуков</h2><p>Локальные шаблоны, работают без ИИ и без сети. Это заготовки: проверь факты и выбери свой голос.</p><form id="generatorForm">${field("topic", "Тема", "запись новой песни", "text", 'required maxlength="150"')}<label>Настроение<select name="mood">${opts(["С иронией", "Спокойно", "Лично"], "С иронией")}</select></label><button class="primary wide">Собрать варианты</button></form><div id="generated"></div>`,
  );
}
function dayMeta() {
  const m = state.dayMeta[date] || {};
  open(
    `<h2>Тема · ${fmt(date)}</h2><form id="dayMetaForm">${field("theme", "Тема дня", m.theme || "")}${field("track", "Трек дня / чужой звук", m.track || state.track)}<p>Чужой звук выбирай в официальном каталоге площадки. Трек не обязателен для разговоров и влогов.</p><button class="primary wide">Сохранить</button></form>`,
  );
}
function renderTrends() {
  $("#app").innerHTML =
    `<section class="panel"><span class="eyebrow">МЕХАНИКИ, А НЕ ОБЕЩАНИЯ ОХВАТОВ</span><h1>Тренды под твою жизнь</h1><p>Каталог локальный. Живого обновления нет. «Проверено вручную» означает твою дату и источник; даже свежая дата не гарантирует актуальность.</p><div class="actions wrap"><button id="newTrend" class="primary">Добавить механику</button><button id="exportTrends">Экспорт каталога</button></div><label>Импорт каталога JSON<input id="importTrends" type="file" accept="application/json,.json"></label></section><div class="cards">${state.trends.map((t) => `<article class="card"><span class="pill">${t.status === "evergreen" ? "Вечнозелёная механика" : t.status === "verified" ? "Проверено вручную" : "Нужно проверить"}</span><h3>${esc(t.title)}</h3><p>${esc(t.mechanic)}</p><div class="copy-block"><small>POV</small><p>${esc(t.pov)}</p><button data-trendcopy="${esc(t.id)}">Копировать POV</button></div><p>${esc(t.examples)}</p><p>Последняя проверка: ${t.checked ? fmt(t.checked) : "не проверено"}<br>Поиск TikTok: ${esc(t.query || "не задан")}</p>${t.url ? `<a href="${esc(t.url)}" target="_blank" rel="noopener noreferrer">Источник ↗</a>` : ""}<div class="actions wrap"><button data-trendedit="${esc(t.id)}">Редактировать</button><button data-trenddelete="${esc(t.id)}">Удалить</button></div></article>`).join("") || '<div class="panel empty">Добавь наблюдаемую механику, POV и источник или поисковую фразу.</div>'}</div>`;
}
function trendForm(t) {
  trendEdit = t?.id || null;
  t = t || {
    title: "",
    mechanic: "",
    pov: "",
    query: "",
    url: "",
    checked: "",
    status: "check",
    examples: "",
  };
  open(
    `<h2>${trendEdit ? "Изменить" : "Добавить"} механику</h2><form id="trendForm">${field("title", "Название", t.title, "text", 'required maxlength="200"')}${area("mechanic", "Что происходит в кадре", t.mechanic)}${area("pov", "Точный адаптированный POV", t.pov)}${field("query", "Поисковая фраза TikTok", t.query)}${field("url", "Источник / TikTok-ссылка", t.url, "url")}${field("checked", "Когда проверено вручную", t.checked, "date", `max="${C.today()}"`)}<label>Метка<select name="status">${opts(
      [
        ["check", "Нужно проверить"],
        ["verified", "Проверено вручную"],
        ["evergreen", "Вечнозелёная механика"],
      ],
      t.status,
    )}</select></label>${area("examples", "Примеры / адаптация по кадрам", t.examples)}<button class="primary wide">Сохранить механику</button></form>`,
  );
}
function renderStats() {
  const rows = C.samples(state, ideas, { ...report, end: date }),
    ranking = C.aggregate(rows, report.group, report.metric),
    start = C.shift(date, 1 - report.period),
    released = C.entries(state).filter(
      ({ d, r }) =>
        r.status === "published" &&
        releaseDay(r, d) >= start &&
        releaseDay(r, d) <= date,
    );
  const days = Array.from({ length: report.period }, (_, i) =>
      C.shift(start, i),
    ),
    counts = days.map(
      (d) =>
        C.entries(state).filter(
          (x) => x.r.status === "published" && releaseDay(x.r, x.d) === d,
        ).length,
    ),
    max = Math.max(1, ...counts);
  const countByCat = C.aggregate(rows, "category", report.metric);
  const top = countByCat[0],
    weak = countByCat.at(-1);
  const fs = state.followers
    .filter(
      (f) =>
        f.platform === report.platform && f.date >= start && f.date <= date,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
  $("#app").innerHTML =
    `<section class="panel"><span class="eyebrow">ТОЛЬКО ТВОИ ВВЕДЁННЫЕ ДАННЫЕ</span><h1>Что хочется повторить</h1><div class="filters-grid">${[
      [
        "period",
        "Период",
        [
          [7, "7 дней"],
          [30, "30 дней"],
        ],
      ],
      ["platform", "Площадка", platforms],
      ["age", "Возраст", Object.entries(ageNames)],
      ["metric", "Показатель", Object.entries(metricLabels)],
      [
        "group",
        "Сравнение",
        [
          ["category", "Категории"],
          ["format", "Форматы / ролики"],
          ["hook", "Хуки"],
        ],
      ],
      ["mode", "Режим", ["Органика", "Пробный Reels", "Реклама"]],
    ]
      .map(
        ([k, l, xs]) =>
          `<label>${l}<select data-report="${k}">${opts(xs, String(report[k]))}</select></label>`,
      )
      .join(
        "",
      )}</div><p>${fmt(start)} — ${fmt(date)} · ${released.length} выпущенных роликов · ${rows.length} замеров в выбранном срезе. Публикация на нескольких площадках считается одним роликом.</p><p>Ориентир темпа: ${state.settings.count} в день сейчас. Историческое число запланированных задач: ${Object.entries(
      state.days,
    )
      .filter(([d]) => d >= start && d <= date)
      .reduce(
        (n, [, rs]) => n + rs.length,
        0,
      )}. Пустые дни не считаем провалом.</p><div class="table-scroll"><table><thead><tr><th>${report.group === "category" ? "Категория" : report.group === "hook" ? "Хук" : "Формат"}</th><th>Роликов с данными</th><th>Медиана</th><th>Среднее</th></tr></thead><tbody>${ranking.map((r) => `<tr><td>${esc(categories[r.name] || r.name)}</td><td>${r.n}</td><td>${number(r.median)}</td><td>${number(r.mean)}</td></tr>`).join("") || '<tr><td colspan="4">Замеров пока нет. Открой «Результат» в карточке опубликованного ролика.</td></tr>'}</tbody></table></div><div class="tip">${top ? `${top.n < 3 ? "Малая выборка: вывод предварительный. " : ""}По показателю «${metricLabels[report.metric]}» выше медиана у «${categories[top.name]}» (${number(top.median)}, n=${top.n}). ${countByCat.length > 1 ? `Ниже — «${categories[weak.name]}» (${number(weak.median)}, n=${weak.n}). ` : ""}${top.n >= 3 ? "Попробуй ещё один ролик этой категории, сохрани возраст замера и площадку." : "Добавь ещё замеры этой и других категорий, прежде чем выбирать победителя."}` : "Запиши первые замеры, чтобы получить совет по собственным результатам."} Категория, тема, распространение и хук меняются одновременно; сравнение не доказывает причину.</div></section><section class="panel"><h2>Ритм публикаций</h2><div class="chart" role="img" aria-label="${esc(days.map((d, i) => fmt(d) + ": " + counts[i]).join("; "))}">${days.map((d, i) => `<div class="bar"><b>${counts[i]}</b><i style="height:${(counts[i] / max) * 90 + 3}px"></i><small>${fmt(d, { day: "numeric" })}</small></div>`).join("")}</div><h3>${metricLabels[report.metric]} по дням</h3><p>Медиана в выбранном срезе. Прочерк означает отсутствие данных.</p>${metricChart(rows, days)}</section><section class="panel"><h2>Сравнение роликов</h2>${rows.map(({ r, idea, m, d }) => `<div class="task-row"><div><b>${esc(idea.title)}</b><small>${fmt(d)} · ${esc(idea.hook)}</small></div><button data-metrics="${r.id}">${number(C.numeric(m[report.metric]))}</button></div>`).join("") || "<p>Выбери другой срез или внеси результаты.</p>"}</section><section class="panel"><div class="heading"><h2>История подписчиков</h2><button id="followers">Добавить</button></div><p>Общее число в профиле вводится вручную и хранится отдельно от подписок с ролика.</p>${fs.map((f) => `<div class="task-row"><span>${fmt(f.date)} · ${esc(f.platform)}</span><b>${number(f.value)}</b><button data-follower-delete="${esc(f.id)}" aria-label="Удалить замер подписчиков">×</button></div>`).join("") || "<p>Для этого периода и площадки записей нет.</p>"}${fs.length > 1 ? `<p>Изменение за доступные точки: ${number(fs.at(-1).value - fs[0].value)}.</p>` : ""}</section>`;
}
function releaseDay(r, fallback) {
  const ats = Object.values(r.publications)
    .map((p) => p.at)
    .filter(Boolean)
    .sort();
  return ats.length
    ? new Intl.DateTimeFormat("en-CA", {
        timeZone: "Europe/Moscow",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(ats[0]))
    : fallback;
}
function number(x) {
  return x === null
    ? "—"
    : Number(Number(x).toFixed(1)).toLocaleString("ru-RU");
}
function metricChart(rows, days) {
  const vals = days.map((d) =>
      C.median(
        rows
          .filter((r) => r.d === d)
          .map((r) => C.numeric(r.m[report.metric]))
          .filter((x) => x !== null),
      ),
    ),
    max = Math.max(1, ...vals.filter((x) => x !== null));
  return `<div class="chart metric-chart">${days.map((d, i) => `<div class="bar"><b>${number(vals[i])}</b><i class="purple" style="height:${vals[i] === null ? 0 : (vals[i] / max) * 90 + 3}px;${vals[i] === null ? "visibility:hidden" : ""}"></i><small>${fmt(d, { day: "numeric" })}</small></div>`).join("")}</div>`;
}
function download(name, value) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function rawExport() {
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) {
      const k = storage.key(i);
      if (k.startsWith(C.OLD) || k.startsWith(C.KEY)) keys.push(k);
    }
    download(
      "ritm-raw-backups-" + C.today() + ".json",
      Object.fromEntries(keys.map((k) => [k, storage.getItem(k)])),
    );
  } catch {
    toast(
      "Хранилище недоступно. Экспортируй текущие данные кнопкой «Экспорт JSON».",
    );
  }
}
function changeStatus(r, status) {
  if (status === "published") {
    publication(r);
    return;
  }
  r.status = status;
  save();
  render();
}
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  const r = d.id ? find(d.id)?.r : null;
  if (d.tab) {
    tab = d.tab;
    render();
    window.scrollTo({ top: 0 });
  }
  if (d.growthTrack) {
    RitmGrowth.select(d.growthTrack);
    render();
  }
  if (d.growthCopy) {
    const f = ideas.find(x => x.id === d.growthCopy);
    if (f) await copy(f.pov + "\n\n" + f.caption + "\n" + f.tags);
  }
  if (d.growthPlan) {
    let added = 0;
    for (let i = 0; i < RitmGrowth.week.length; i++) {
      const plannedDate = C.shift(date, i);
      const dayTasks = C.ensureDay(state, plannedDate, ideas);
      const id = RitmGrowth.week[i];
      if (dayTasks.some(x => x.ideaId === id)) continue;
      const idea = ideas.find(x => x.id === id);
      if (!idea) continue;
      const task = C.task(idea, "19:00");
      task.createdDate = plannedDate;
      dayTasks.push(task);
      added++;
    }
    const ok = save();
    render();
    toast(ok ? (added ? "Добавлено " + added + " конкретных съёмок без удаления старых" : "Все семь идей уже в плане") : "План изменён только в этой вкладке. Экспортируй JSON.");
  }
  if (d.date) {
    date = d.date;
    render();
  }
  if (d.select) {
    date = d.select;
    tab = "today";
    render();
    window.scrollTo({ top: 0 });
  }
  if (d.calendar) {
    calendar = +d.calendar;
    render();
  }
  if (d.scenario) {
    const x = find(d.scenario);
    if (x) scenario(x.r);
  }
  if (d.idea) {
    activeTask = null;
    scenario(
      null,
      ideas.find((x) => x.id === d.idea),
    );
  }
  if (d.fav) {
    state.favorites = state.favorites.includes(d.fav)
      ? state.favorites.filter((x) => x !== d.fav)
      : [...state.favorites, d.fav];
    save();
    render();
  }
  if (d.copy && r) {
    const f = C.brief(r, ideas);
    await copy(d.copy === "caption" ? f.caption + "\n" + f.tags : f[d.copy]);
  }
  if (d.briefcopy) {
    const f =
      activeTask && find(activeTask)
        ? C.brief(find(activeTask).r, ideas)
        : ideas.find((x) => x.id === d.ideaId);
    await copy(
      d.briefcopy === "full"
        ? fullBrief(f)
        : d.briefcopy === "caption"
          ? f.caption + "\n" + f.tags
          : f[d.briefcopy],
    );
  }
  if (d.edit) editTask(find(d.edit).r);
  if (d.replace) replacement(find(d.replace).r);
  if (d.swap && r) {
    const result = C.replace(state, r, ideas, date, d.swap);
    if (result.error) toast(result.error);
    else {
      finish("Идея заменена. Можно отменить.");
    }
  }
  if (d.undo) {
    if (C.undo(find(d.undo).r)) {
      save();
      render();
      toast("Прежний вариант возвращён");
    } else toast("Отмена доступна до отметок и результатов");
  }
  if (d.stage && r) changeStatus(r, d.stage);
  if (d.publish) publication(find(d.publish).r);
  if (d.metrics) metrics(find(d.metrics).r);
  if (d.move) moveForm(find(d.move).r);
  if (d.add) addForm(d.add);
  if (d.trendedit) trendForm(state.trends.find((x) => x.id === d.trendedit));
  if (d.trendcopy)
    await copy(state.trends.find((x) => x.id === d.trendcopy).pov);
  if (d.trenddelete && confirm("Удалить механику из каталога?")) {
    state.trends = state.trends.filter((x) => x.id !== d.trenddelete);
    save();
    render();
  }
  if (d.followerDelete) {
    state.followers = state.followers.filter((f) => f.id !== d.followerDelete);
    save();
    render();
  }
  switch (b.id) {
    case "settings":
      settings();
      break;
    case "low":
      low = !low;
      render();
      break;
    case "dayMeta":
      dayMeta();
      break;
    case "generator":
      generator();
      break;
    case "newTrend":
      trendForm();
      break;
    case "resetFilters":
      filters = {
        q: "",
        category: "",
        effort: "",
        location: "",
        face: "",
        music: "",
        props: "",
        scope: "",
      };
      render();
      break;
    case "export":
      download("ritm-content-" + C.today() + ".json", state);
      break;
    case "rawExport":
      rawExport();
      break;
    case "exportTrends":
      download("ritm-trends.json", { version: 1, trends: state.trends });
      break;
    case "refreshDay": {
      let n = 0;
      for (const task of records()) {
        if (C.replace(state, task, ideas, date, "other").ok) n++;
      }
      save();
      render();
      toast(
        n
          ? "Заменено " + n + " нетронутых карточек. В каждой доступна отмена."
          : "Нет карточек для безопасной замены.",
      );
      break;
    }
    case "fillPlan":
      for (let i = 0; i < calendar; i++)
        C.ensureDay(state, C.shift(date, i), ideas);
      save();
      render();
      toast("Пустые дни заполнены");
      break;
    case "followers":
      open(
        `<h2>Число подписчиков</h2><form id="followersForm"><label>Площадка<select name="platform">${opts(platforms, report.platform)}</select></label>${field("date", "Дата", date, "date", "required")}${field("value", "Подписчиков всего", "", "number", 'min="0" step="1" required')}<button class="primary wide">Сохранить</button></form>`,
      );
      break;
    case "reset":
      if (
        confirm(
          "Начать заново? Текущий план будет заменён. Сначала экспортируй JSON. Исходник v1 и бэкапы останутся.",
        )
      ) {
        try {
          const raw = storage.getItem(C.KEY);
          if (raw) storage.setItem(C.KEY + "-backup-" + Date.now(), raw);
          state = C.initial();
          blocked = false;
          if (save()) {
            notice("");
            close();
            render();
          }
        } catch {
          notice("Сброс остановлен: резервную копию не удалось сохранить.");
        }
      }
      break;
  }
});
document.addEventListener("input", (e) => {
  if (e.target.id === "search") {
    filters.q = e.target.value;
    const list = matchedIdeas();
    $("#found").textContent = "Найдено: " + list.length;
    $("#ideaCards").innerHTML =
      list.map(ideaCard).join("") ||
      '<div class="panel empty">Ничего не найдено. Измени поиск или фильтры.</div>';
  }
});
document.addEventListener("change", async (e) => {
  const t = e.target,
    d = t.dataset;
  if (d.status) changeStatus(find(d.status).r, t.value);
  if (d.filter) {
    filters[d.filter] = t.value;
    render();
  }
  if (d.report) {
    report[d.report] = d.report === "period" ? +t.value : t.value;
    render();
  }
  if (d.check) {
    const r = find(d.check).r,
      n = +d.step;
    r.checks = t.checked
      ? [...new Set([...r.checks, n])]
      : r.checks.filter((x) => x !== n);
    save();
  }
  if (t.id === "pubPlatform") {
    const r = find($("#publishForm").dataset.id).r;
    publication(r, t.value);
  }
  if (t.id === "metricPlatform" || t.id === "metricAge") {
    metrics(
      find($("#metricsForm").dataset.id).r,
      $("#metricPlatform").value,
      $("#metricAge").value,
    );
  }
  if (t.id === "import" || t.id === "importTrends") {
    const file = t.files[0];
    if (!file) return;
    try {
      if (file.size > 10000000) throw Error("Файл больше 10 МБ");
      const parsed = JSON.parse(await file.text());
      if (t.id === "importTrends") {
        if (
          parsed.version !== 1 ||
          !Array.isArray(parsed.trends) ||
          parsed.trends.length > 500
        )
          throw Error("Неверный каталог");
        parsed.trends.forEach(C.validateTrend);
        if (
          new Set(parsed.trends.map((x) => x.id)).size !== parsed.trends.length
        )
          throw Error("Повторяющиеся ID");
        if (!confirm("Заменить каталог трендов проверенными данными файла?"))
          return;
        state.trends = parsed.trends;
        save();
        render();
        toast("Каталог импортирован");
      } else {
        const incoming =
          parsed.version === 2
            ? C.validate(parsed, ideas)
            : C.migrate(parsed, ideas);
        if (
          !confirm(
            "Заменить текущие данные? Перед заменой будет сохранён локальный бэкап.",
          )
        )
          return;
        const raw = storage.getItem(C.KEY);
        if (raw) storage.setItem(C.KEY + "-backup-" + Date.now(), raw);
        else
          storage.setItem(
            C.KEY + "-backup-" + Date.now(),
            JSON.stringify(state),
          );
        const written = C.persist(storage, incoming, ideas);
        if (!written.ok) throw Error(written.error);
        state = incoming;
        blocked = false;
        notice("");
        close();
        render();
        toast("Данные восстановлены");
      }
    } catch (err) {
      toast("Импорт остановлен: " + err.message);
    }
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target,
    data = new FormData(form),
    get = (k) => String(data.get(k) || ""),
    r = form.dataset.id ? find(form.dataset.id)?.r : null;
  try {
    switch (form.id) {
      case "settingsForm": {
        const n = Number(get("count")),
          cats = data.getAll("category");
        if (!cats.length) throw Error("Выбери хотя бы одну категорию");
        if (!Number.isInteger(n) || n < 1 || n > 8)
          throw Error("Количество: 1–8");
        state.track = get("track").trim();
        state.hook = get("hook").trim();
        state.settings = {
          count: n,
          times: Array.from({ length: 8 }, (_, i) => get("time" + i)),
          categories: cats,
        };
        if (data.has("apply")) {
          const rs = records();
          while (rs.length > n) {
            const i = rs.findLastIndex(
              (x) =>
                x.status === "idea" &&
                !x.checks.length &&
                !Object.keys(x.edits).length &&
                !x.history.length &&
                !Object.keys(x.metrics).length &&
                !Object.keys(x.publications).length,
            );
            if (i < 0) break;
            rs.splice(i, 1);
          }
          while (rs.length < n) {
            const f = C.choose(state, ideas, date);
            if (!f) break;
            rs.push(C.task(f, state.settings.times[rs.length]));
          }
          rs.forEach((r, i) => {
            if (r.status === "idea") r.time = state.settings.times[i % 8];
          });
        }
        finish("Настройки применены");
        break;
      }
      case "editForm":
        for (const k of [
          "pov",
          "hook",
          "script",
          "setup",
          "edit",
          "sound",
          "caption",
          "cta",
          "tags",
          "publish",
        ])
          r.edits[k] = get(k);
        save();
        close();
        render();
        break;
      case "moveForm": {
        let dest =
          get("target") === "queue"
            ? "queue"
            : get("target") === "tomorrow"
              ? C.shift(find(r.id).d === "queue" ? date : find(r.id).d, 1)
              : get("date");
        if (dest !== "queue" && !C.dateOK(dest))
          throw Error("Укажи корректную дату");
        const x = find(r.id),
          source = x.d === "queue" ? state.queue : state.days[x.d];
        source.splice(
          source.findIndex((x) => x.id === r.id),
          1,
        );
        r.time = get("time");
        r.originDate ??= x.d === "queue" ? date : x.d;
        if (dest === "queue") state.queue.push(r);
        else {
          state.days[dest] ??= [];
          state.days[dest].push(r);
        }
        save();
        close();
        render();
        break;
      }
      case "addForm": {
        const f = ideas.find((x) => x.id === form.dataset.idea),
          dest = get("target") === "queue" ? "queue" : get("date");
        if (dest !== "queue" && !C.dateOK(dest)) throw Error("Укажи дату");
        const rs = dest === "queue" ? state.queue : (state.days[dest] ??= []);
        if (rs.some((r) => r.ideaId === f.id))
          throw Error("Эта идея уже здесь есть");
        const added = C.task(f, get("time"));
        added.createdDate = dest === "queue" ? date : dest;
        rs.push(added);
        finish("Идея добавлена");
        break;
      }
      case "publishForm": {
        if (!C.safeURL(get("url")))
          throw Error("Ссылка должна начинаться с https:// или http://");
        r.publications[get("platform")] = {
          url: get("url"),
          at: new Date(get("at") + ":00+03:00").toISOString(),
        };
        r.status = "published";
        finish("Публикация сохранена");
        break;
      }
      case "metricsForm": {
        const p = get("platform"),
          age = get("age"),
          m = Object.fromEntries(
            [...C.metricsKeys, "mode", "note", "url"].map((k) => [k, get(k)]),
          );
        C.metricsKeys.forEach((k) => {
          if (
            m[k] !== "" &&
            (C.numeric(m[k]) === null ||
              (["completion", "chosen"].includes(k) && +m[k] > 100))
          )
            throw Error("Проверь " + metricLabels[k]);
        });
        if (!C.safeURL(m.url)) throw Error("Неверная ссылка");
        m.measuredAt = new Date(get("at") + ":00+03:00").toISOString();
        r.metrics[p] ??= {};
        if (age === "legacy") {
          if (r.metrics[p].snapshots) r.metrics[p].legacy = m;
          else r.metrics[p] = { ...r.metrics[p], ...m };
        } else {
          if (!r.metrics[p].snapshots && Object.keys(r.metrics[p]).length) {
            const legacy = C.clone(r.metrics[p]);
            r.metrics[p] = { snapshots: {}, legacy };
          }
          r.metrics[p].snapshots ??= {};
          r.metrics[p].snapshots[age] = m;
        }
        finish("Замер сохранён");
        break;
      }
      case "dayMetaForm":
        state.dayMeta[date] = { theme: get("theme"), track: get("track") };
        save();
        close();
        render();
        break;
      case "trendForm": {
        const t = {
          id: trendEdit || C.uid(),
          ...Object.fromEntries(
            [
              "title",
              "mechanic",
              "pov",
              "query",
              "url",
              "checked",
              "status",
              "examples",
            ].map((k) => [k, get(k)]),
          ),
        };
        C.validateTrend(t);
        if (t.checked > C.today())
          throw Error("Дата проверки ещё не наступила");
        if (trendEdit)
          state.trends = state.trends.map((x) => (x.id === trendEdit ? t : x));
        else state.trends.push(t);
        save();
        close();
        render();
        break;
      }
      case "followersForm": {
        const value = Number(get("value"));
        if (!Number.isInteger(value) || value < 0 || !C.dateOK(get("date")))
          throw Error("Проверь дату и число");
        const prev = state.followers.find(
          (f) => f.date === get("date") && f.platform === get("platform"),
        );
        if (prev) prev.value = value;
        else
          state.followers.push({
            id: C.uid(),
            platform: get("platform"),
            date: get("date"),
            value,
          });
        save();
        close();
        render();
        break;
      }
      case "generatorForm": {
        const theme = get("topic").trim(),
          mood = get("mood");
        const vs =
          mood === "С иронией"
            ? [
                `POV: хотел просто ${theme.toLowerCase()}, но снова открыл диктофон`,
                `Когда обещал себе «пять минут» на ${theme.toLowerCase()}`,
                `Хук: «Сейчас покажу, как ${theme.toLowerCase()} заняло весь вечер».`,
              ]
            : mood === "Лично"
              ? [
                  `POV: маленькая история про ${theme.toLowerCase()}, которую я долго не рассказывал`,
                  `Хук: «В теме “${theme}” для меня есть одна важная деталь».`,
                  `Хук: «Раньше я думал про ${theme.toLowerCase()} совсем иначе».`,
                ]
              : [
                  `POV: обычный день и ${theme.toLowerCase()}`,
                  `Хук: «Покажу один простой шаг: ${theme.toLowerCase()}».`,
                  `Хук: «Вот что я заметил, пока разбирался с темой “${theme}”».`,
                ];
        $("#generated").innerHTML = vs
          .map(
            (v) =>
              `<div class="copy-block"><p>${esc(v)}</p><button type="button" data-generated="${esc(v)}">Копировать</button></div>`,
          )
          .join("");
        break;
      }
    }
  } catch (err) {
    toast(err.message);
  }
});
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-generated]");
  if (b) copy(b.dataset.generated);
});
render();
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js?v=4", { scope: "./", updateViaCache: "none" })
    .then((r) => r.update())
    .catch(() => {});
