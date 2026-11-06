(function (root) {
  "use strict";
  const KEY = "ritm-content-v2",
    OLD = "ritm-snippets-v1",
    statuses = ["idea", "shot", "editing", "ready", "published", "skipped"];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const dateOK = (x) =>
    typeof x === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(x) &&
    !isNaN(Date.parse(x)) &&
    new Date(x + "T12:00Z").toISOString().slice(0, 10) === x;
  const uid = () =>
    globalThis.crypto?.randomUUID?.() ||
    Date.now().toString(36) + Math.random().toString(36).slice(2);
  const today = () =>
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Moscow",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  const shift = (d, n) => {
    const x = new Date(d + "T12:00Z");
    x.setUTCDate(x.getUTCDate() + n);
    return x.toISOString().slice(0, 10);
  };
  const numeric = (x) =>
    (typeof x === "string" || typeof x === "number") &&
    x !== "" &&
    x !== null &&
    x !== undefined &&
    Number.isFinite(Number(x)) &&
    Number(x) >= 0
      ? Number(x)
      : null;
  const median = (a) => {
    if (!a.length) return null;
    const b = [...a].sort((x, y) => x - y),
      i = Math.floor(b.length / 2);
    return b.length % 2 ? b[i] : (b[i - 1] + b[i]) / 2;
  };
  const metricsKeys = [
    "views",
    "likes",
    "comments",
    "shares",
    "saves",
    "followers",
    "watch",
    "retention",
    "chosen",
    "completion",
  ];
  const defaultTimes = [
    "12:00",
    "15:00",
    "18:00",
    "21:00",
    "22:00",
    "10:00",
    "14:00",
    "20:00",
  ];
  const initial = () => ({
    version: 2,
    track: "",
    hook: "",
    settings: {
      count: 4,
      times: defaultTimes,
      categories: ["humor", "talk", "music", "studio", "pov", "experiment"],
    },
    days: {},
    dayMeta: {},
    favorites: [],
    queue: [],
    recent: [],
    trends: [
      {
        id: "evergreen-pov",
        title: "Случайно включился ваш трек",
        mechanic:
          "Бытовое действие прерывает знакомая песня. Продолжи действие после короткой паузы.",
        pov: "Когда случайно включился трек, под который вы расстались",
        query: "POV песня после расставания",
        url: "",
        checked: "",
        status: "evergreen",
        examples:
          "Мой кружку → останови руку на первой ноте → выключи звук и продолжи. 10–15 секунд.",
      },
      {
        id: "evergreen-layers",
        title: "До / после: добавляю один слой",
        mechanic:
          "Одинаковый фрагмент до и после добавления инструмента, с подписями.",
        pov: "Как звучит грустная песня до и после барабанов",
        query: "music production before after drums",
        url: "",
        checked: "",
        status: "evergreen",
        examples:
          "Два такта голоса → те же такты с барабанами → короткий повтор.",
      },
    ],
    followers: [],
    migration: null,
  });
  function task(idea, time) {
    return {
      id: uid(),
      ideaId: idea.id,
      status: "idea",
      time,
      edits: {},
      metrics: {},
      publications: {},
      history: [],
      checks: [],
    };
  }
  function brief(r, ideas) {
    const idea = ideas.find((x) => x.id === r.ideaId);
    return { ...idea, ...r.edits };
  }
  function recentIds(s, d) {
    return new Set([
      ...s.recent.slice(-80).map((x) => x.ideaId),
      ...Object.entries(s.days)
        .filter(
          ([day]) =>
            Math.abs((Date.parse(day) - Date.parse(d)) / 86400000) < 14,
        )
        .flatMap(([, rs]) => rs.map((r) => r.ideaId)),
      ...s.queue.map((r) => r.ideaId),
    ]);
  }
  // Режим артиста: ежедневные идеи только из «Фокуса».
  // Вся старая библиотека остаётся доступной через «Идеи».
  const focusCycle = ["ushi", "glaza", "ushi", "net", "ushi", "glaza", "ushi", "pravda"];
  function focusPool(s, ideas) {
    const available = ideas.filter(x => s.settings.categories.includes(x.category));
    const focused = available.filter(x => x.id.startsWith("focus-"));
    return focused.length ? focused : available;
  }
  function focusPick(s, ideas, d, slot = 0, excluded = new Set()) {
    const pool = focusPool(s, ideas).filter(x => !excluded.has(x.id));
    if (!pool.length) return null;
    const dayOffset = Math.round((Date.parse(d) - Date.parse("2026-11-06")) / 86400000);
    const desired = focusCycle[((dayOffset * s.settings.count + slot) % focusCycle.length + focusCycle.length) % focusCycle.length];
    const seen = recentIds(s, d);
    const fresh = pool.filter(x => !seen.has(x.id));
    const matching = fresh.find(x => x.growthTrack === desired);
    return matching || fresh[0] ||
      pool.find(x => x.growthTrack === desired) ||
      pool.sort((a,b) => s.recent.findIndex(x=>x.ideaId===a.id) - s.recent.findIndex(x=>x.ideaId===b.id))[0];
  }
  function choose(s, ideas, d, mode = "any", current) {
    // Даже замена «другая идея» не возвращает случайный юмор,
    // если основной набор состоит из сценариев Тимы.
    let pool = focusPool(s, ideas);
    if (mode === "same") pool = pool.filter(x => x.category === current?.category);
    if (mode === "other") pool = pool.filter(x => x.category !== current?.category);
    if (mode === "simpler") pool = pool.filter(x => x.props === "нет" || x.effort === 5);
    if (mode === "faster") pool = pool.filter(x => x.effort === 5);
    if (mode === "faceless") pool = pool.filter(x => !x.face);
    if (mode === "trend") pool = pool.filter(x => x.category === "pov");
    if (mode === "track") pool = pool.filter(x => x.category === "music");
    pool = pool.filter(x => x.id !== current?.id);
    const seen = recentIds(s, d);
    return pool.find(x => !seen.has(x.id)) ||
      pool.sort((a,b) => s.recent.findIndex(x=>x.ideaId===a.id) - s.recent.findIndex(x=>x.ideaId===b.id))[0] ||
      null;
  }
  function ensureDay(s, d, ideas) {
    if (s.days[d]) return s.days[d];
    s.days[d] = [];
    for (let i = 0; i < s.settings.count; i++) {
      const picked = focusPick(s, ideas, d, i);
      if (!picked) break;
      const r = task(picked, s.settings.times[i]);
      s.days[d].push(r);
      s.recent.push({ideaId:picked.id,date:d});
    }
    s.recent = s.recent.slice(-200);
    return s.days[d];
  }
  function alignFocusDay(s, d, ideas) {
    const day = ensureDay(s,d,ideas);
    let changed=0;
    const excluded = new Set(day.filter(r=>r.ideaId.startsWith("focus-")).map(r=>r.ideaId));
    day.forEach((r,i)=>{
      // Не трогаем снятое, отредактированное, перемещённое, вручную добавленное.
      if (r.ideaId.startsWith("focus-") || r.focusAdjusted ||
          r.status !== "idea" || r.createdDate || r.originDate || r.legacy ||
          r.checks.length || r.history.length ||
          Object.keys(r.edits).length || Object.keys(r.metrics).length ||
          Object.keys(r.publications).length) return;
      const picked = focusPick(s,ideas,d,i,excluded);
      if (!picked) return;
      const previous = r.ideaId;
      r.history.push({ideaId:previous,edits:clone(r.edits)});
      r.ideaId = picked.id;
      r.focusAdjusted = true; // После «отменить» больше автоматически не менять.
      excluded.add(picked.id);
      s.recent.push({ideaId:picked.id,date:d});
      changed++;
    });
    s.recent=s.recent.slice(-200);
    return changed;
  }
  function replace(s, r, ideas, d, mode) {
    if (
      r.status !== "idea" ||
      r.checks.length ||
      Object.keys(r.metrics).length ||
      Object.keys(r.publications).length
    )
      return {
        error:
          "У карточки есть этапы или результаты. Перенеси её в очередь и добавь новую идею.",
      };
    const next = choose(s, ideas, d, mode, brief(r, ideas));
    if (!next)
      return {
        error:
          "Нет подходящего варианта. Попробуй другой фильтр или включи больше категорий.",
      };
    r.history.push({ ideaId: r.ideaId, edits: clone(r.edits) });
    r.history = r.history.slice(-12);
    r.ideaId = next.id;
    r.edits = {};
    r.checks = [];
    s.recent.push({ ideaId: next.id, date: d });
    s.recent = s.recent.slice(-200);
    return { ok: true };
  }
  function undo(r) {
    if (
      r.status !== "idea" ||
      r.checks.length ||
      Object.keys(r.metrics).length ||
      Object.keys(r.publications).length
    )
      return false;
    const prev = r.history.pop();
    if (!prev) return false;
    r.ideaId = prev.ideaId;
    r.edits = prev.edits;
    r.checks = [];
    return true;
  }
  function validateMetrics(ms) {
    if (!ms || typeof ms !== "object" || Array.isArray(ms))
      throw Error("Неверные метрики");
    for (const m of Object.values(ms)) {
      if (!m || typeof m !== "object" || Array.isArray(m))
        throw Error("Неверный замер");
      for (const [k, v] of Object.entries(m)) {
        if (
          metricsKeys.includes(k) &&
          v !== "" &&
          v !== null &&
          (numeric(v) === null ||
            (["completion", "chosen"].includes(k) && Number(v) > 100))
        )
          throw Error("Неверное число в метриках");
        if (k === "snapshots") validateMetrics(v);
        if (k === "legacy") validateMetrics({ legacy: v });
      }
    }
  }
  function safeURL(x) {
    if (!x) return true;
    try {
      return ["http:", "https:"].includes(new URL(x).protocol);
    } catch {
      return false;
    }
  }
  const idOK = (x) => typeof x === "string" && /^[a-zA-Z0-9_-]{1,100}$/.test(x);
  function validateTrend(t) {
    if (
      !t ||
      !idOK(t.id) ||
      !["evergreen", "check", "verified"].includes(t.status)
    )
      throw Error("Неверный тренд");
    for (const k of [
      "title",
      "mechanic",
      "pov",
      "query",
      "url",
      "checked",
      "examples",
    ])
      if (typeof t[k] !== "string" || t[k].length > 5000)
        throw Error("Неверное поле тренда");
    if (
      !safeURL(t.url) ||
      (t.checked && !dateOK(t.checked)) ||
      (t.status === "verified" && (!t.checked || (!t.url && !t.query)))
    )
      throw Error("Для проверки нужны дата и источник или поиск");
  }
  function validate(s, ideas) {
    if (
      !s ||
      s.version !== 2 ||
      typeof s.track !== "string" ||
      typeof s.hook !== "string" ||
      !s.settings ||
      !Number.isInteger(s.settings.count) ||
      s.settings.count < 1 ||
      s.settings.count > 8
    )
      throw Error("Неверная версия или настройки");
    if (
      !Array.isArray(s.settings.times) ||
      s.settings.times.length !== 8 ||
      !s.settings.times.every((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x))
    )
      throw Error("Неверное время");
    if (
      !Array.isArray(s.settings.categories) ||
      !s.settings.categories.length ||
      s.settings.categories.some(
        (x) => !Object.keys(root.RitmCatalog.categories).includes(x),
      )
    )
      throw Error("Неверные категории");
    const ids = new Set();
    const check = (r) => {
      if (
        !r ||
        !idOK(r.id) ||
        ids.has(r.id) ||
        !ideas.some((x) => x.id === r.ideaId) ||
        !statuses.includes(r.status) ||
        !r.edits ||
        typeof r.edits !== "object" ||
        Array.isArray(r.edits) ||
        !Array.isArray(r.history) ||
        !Array.isArray(r.checks) ||
        !r.publications ||
        typeof r.publications !== "object" ||
        Array.isArray(r.publications)
      )
        throw Error("Неверная карточка");
      ids.add(r.id);
      if (
        (r.originDate && !dateOK(r.originDate)) ||
        (r.createdDate && !dateOK(r.createdDate))
      )
        throw Error("Неверная исходная дата");
      if (
        typeof r.time !== "string" ||
        !/^([01]\d|2[0-3]):[0-5]\d$/.test(r.time)
      )
        throw Error("Неверное время карточки");
      for (const [k, v] of Object.entries(r.edits))
        if (
          ![
            "pov",
            "hook",
            "script",
            "edit",
            "caption",
            "tags",
            "cta",
            "sound",
            "setup",
            "publish",
          ].includes(k) ||
          typeof v !== "string" ||
          v.length > 10000
        )
          throw Error("Неверный текст");
      for (const h of r.history)
        if (
          !h ||
          !ideas.some((x) => x.id === h.ideaId) ||
          !h.edits ||
          typeof h.edits !== "object"
        )
          throw Error("Неверная история");
      for (const p of Object.values(r.publications))
        if (
          !p ||
          !safeURL(p.url) ||
          typeof p.at !== "string" ||
          (p.at && !Number.isFinite(Date.parse(p.at)))
        )
          throw Error("Неверная публикация");
      validateMetrics(r.metrics);
    };
    if (!s.days || typeof s.days !== "object" || Array.isArray(s.days))
      throw Error("Неверные дни");
    for (const [d, rs] of Object.entries(s.days)) {
      if (!dateOK(d) || !Array.isArray(rs) || rs.length > 100)
        throw Error("Неверный день");
      rs.forEach(check);
    }
    for (const k of ["queue", "favorites", "recent", "trends", "followers"])
      if (!Array.isArray(s[k])) throw Error("Неверный список " + k);
    s.queue.forEach(check);
    s.trends.forEach(validateTrend);
    if (new Set(s.trends.map((t) => t.id)).size !== s.trends.length)
      throw Error("Повтор механик");
    for (const r of s.recent)
      if (!r || !ideas.some((i) => i.id === r.ideaId) || !dateOK(r.date))
        throw Error("Неверная история показов");
    if (s.favorites.some((id) => !ideas.some((x) => x.id === id)))
      throw Error("Неизвестное избранное");
    for (const f of s.followers)
      if (
        !idOK(f.id) ||
        !dateOK(f.date) ||
        numeric(f.value) === null ||
        typeof f.platform !== "string"
      )
        throw Error("Неверная история подписчиков");
    if (!s.dayMeta || typeof s.dayMeta !== "object" || Array.isArray(s.dayMeta))
      throw Error("Неверная тема дня");
    for (const [d, m] of Object.entries(s.dayMeta))
      if (
        !dateOK(d) ||
        !m ||
        typeof m.theme !== "string" ||
        typeof m.track !== "string"
      )
        throw Error("Неверная тема дня");
    return s;
  }
  function migrate(old, ideas) {
    if (
      !old ||
      typeof old.track !== "string" ||
      typeof old.hook !== "string" ||
      !old.days ||
      typeof old.days !== "object" ||
      Array.isArray(old.days) ||
      !Array.isArray(old.times) ||
      !old.times.length ||
      old.times.some((x) => !/^([01]\d|2[0-3]):[0-5]\d$/.test(x))
    )
      throw Error("Неверная старая копия");
    const s = initial();
    s.track = old.track;
    s.hook = old.hook;
    s.settings.times = [...old.times, ...defaultTimes].slice(0, 8);
    s.migration = {
      from: OLD,
      at: new Date().toISOString(),
      legacy: clone(old),
    };
    for (const [d, rs] of Object.entries(old.days)) {
      if (!dateOK(d) || !Array.isArray(rs)) throw Error("Неверный старый день");
      s.days[d] = rs.map((r, i) => {
        const idea = ideas.find((x) => x.id === "legacy-" + r.format);
        if (!idea || typeof r.done !== "boolean")
          throw Error("Неизвестный старый формат");
        validateMetrics(r.metrics);
        const n = task(idea, old.times[i] || defaultTimes[i % 8]);
        n.status = r.done ? "published" : "idea";
        n.edits = { pov: old.hook || idea.pov };
        n.metrics = clone(r.metrics);
        n.legacy = clone(r);
        return n;
      });
    }
    return validate(s, ideas);
  }
  function load(storage, ideas) {
    try {
      const raw = storage.getItem(KEY);
      if (raw) return { state: validate(JSON.parse(raw), ideas) };
      const legacy = storage.getItem(OLD);
      if (legacy) {
        const s = migrate(JSON.parse(legacy), ideas);
        const backup = OLD + "-backup-" + Date.now();
        storage.setItem(backup, legacy);
        storage.setItem(KEY, JSON.stringify(s));
        return {
          state: s,
          message:
            "Старые данные перенесены. Исходник и резервная копия сохранены.",
        };
      }
      return { state: initial() };
    } catch (e) {
      return {
        state: initial(),
        blocked: true,
        message:
          "Не удалось безопасно прочитать или перенести данные: " +
          e.message +
          ". Исходник сохранён. Экспортируй его перед восстановлением.",
      };
    }
  }
  function persist(storage, s, ideas) {
    try {
      validate(s, ideas);
      storage.setItem(KEY, JSON.stringify(s));
      return { ok: true };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }
  const unknownAge = (m) =>
    m?.legacy || (m && metricsKeys.some((k) => m[k] !== undefined) ? m : null);
  function entries(s) {
    return [
      ...Object.entries(s.days).flatMap(([d, rs]) => rs.map((r) => ({ d, r }))),
      ...s.queue.map((r) => ({
        d: r.originDate || r.createdDate || today(),
        r,
      })),
    ];
  }
  function samples(
    s,
    ideas,
    { end, period = 7, platform, age = "24", mode = "Органика" },
  ) {
    const start = shift(end, 1 - period),
      out = [];
    for (const { d, r } of entries(s)) {
      const p = r.publications[platform],
        day = p?.at
          ? new Intl.DateTimeFormat("en-CA", {
              timeZone: "Europe/Moscow",
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }).format(new Date(p.at))
          : d;
      if (day < start || day > end) continue;
      const m =
        age === "legacy"
          ? unknownAge(r.metrics[platform])
          : r.metrics[platform]?.snapshots?.[age];
      if (!m || (m.mode && m.mode !== mode)) continue;
      out.push({ r, d: day, idea: brief(r, ideas), m });
    }
    return out;
  }
  function aggregate(rows, key = "category", metric = "views") {
    const groups = new Map();
    for (const row of rows) {
      const name =
        key === "hook"
          ? row.idea.hook
          : key === "format"
            ? row.idea.format || row.idea.title
            : row.idea.category;
      const val = numeric(row.m[metric]);
      if (val === null) continue;
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(val);
    }
    return [...groups]
      .map(([name, v]) => ({
        name,
        n: v.length,
        median: median(v),
        mean: v.reduce((a, b) => a + b, 0) / v.length,
      }))
      .sort((a, b) => b.median - a.median);
  }
  root.RitmCore = {
    KEY,
    OLD,
    clone,
    today,
    shift,
    uid,
    numeric,
    median,
    metricsKeys,
    statuses,
    initial,
    task,
    brief,
    choose,
    ensureDay,
    alignFocusDay,
    replace,
    undo,
    validate,
    validateTrend,
    safeURL,
    migrate,
    load,
    persist,
    samples,
    aggregate,
    dateOK,
    unknownAge,
    entries,
  };
  if (typeof module !== "undefined") module.exports = root.RitmCore;
})(typeof window !== "undefined" ? window : globalThis);
