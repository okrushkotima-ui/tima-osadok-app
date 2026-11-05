"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
require("../snippets/legacy.js");
const { ideas, categories } = require("../snippets/catalog.js"),
  C = require("../snippets/strategy.js");
const memory = () => {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    map,
  };
};
const old = () => ({
  track: "Правды нет",
  hook: "Моя строка",
  times: ["12:00", "17:00", "21:00"],
  days: {
    "2026-11-05": [
      {
        format: 0,
        done: true,
        metrics: {
          TikTok: { views: "0", retention: "120", note: "замер без возраста" },
        },
      },
      {
        format: 1,
        done: false,
        metrics: {
          "Instagram Reels": {
            views: "8",
            snapshots: {
              48: { views: "500", shares: "4", mode: "Пробный Reels" },
            },
          },
        },
      },
      { format: 2, done: false, metrics: {} },
    ],
  },
});
test("catalog has complete, distinct briefs in all requested groups", () => {
  assert.equal(new Set(ideas.map((x) => x.id)).size, ideas.length);
  assert.ok(ideas.length >= 100);
  for (const c of ["humor", "talk", "pov", "studio"])
    assert.ok(ideas.filter((x) => x.category === c).length >= 20);
  assert.ok(ideas.filter((x) => x.category === "experiment").length >= 10);
  for (const f of ideas) {
    for (const k of [
      "title",
      "props",
      "pov",
      "hook",
      "script",
      "setup",
      "edit",
      "caption",
      "tags",
      "cta",
      "sound",
      "publish",
      "goal",
    ])
      assert.ok(typeof f[k] === "string" && f[k].length > 0, f.id + " " + k);
    assert.equal(f.shots.length, 3);
  }
  assert.ok(ideas.filter((x) => x.demo).length >= 10);
});
test("migration retains all source values and unknown-age and snapshot metrics", () => {
  const source = old(),
    s = C.migrate(source, ideas);
  assert.deepEqual(s.migration.legacy, source);
  assert.equal(s.track, source.track);
  assert.equal(s.hook, source.hook);
  assert.deepEqual(s.settings.times.slice(0, 3), source.times);
  assert.equal(s.days["2026-11-05"][0].status, "published");
  assert.equal(s.days["2026-11-05"][0].edits.pov, source.hook);
  assert.deepEqual(
    s.days["2026-11-05"][1].metrics,
    source.days["2026-11-05"][1].metrics,
  );
  assert.equal(
    C.samples(s, ideas, {
      end: "2026-11-05",
      platform: "TikTok",
      age: "legacy",
    })[0].m.views,
    "0",
  );
});
test("loading migrates only after backup and never modifies original key", () => {
  const store = memory(),
    raw = JSON.stringify(old());
  store.setItem(C.OLD, raw);
  const r = C.load(store, ideas);
  assert.ok(!r.blocked);
  assert.equal(store.getItem(C.OLD), raw);
  assert.ok(
    [...store.map.keys()].some((k) => k.startsWith(C.OLD + "-backup-")),
  );
  assert.deepEqual(JSON.parse(store.getItem(C.KEY)), r.state);
});
test("storage failure in migration preserves source, prevents later accidental overwrite", () => {
  const raw = JSON.stringify(old()),
    store = {
      getItem: (k) => (k === C.OLD ? raw : null),
      setItem() {
        throw Error("quota");
      },
    };
  const r = C.load(store, ideas);
  assert.equal(r.blocked, true);
  assert.equal(store.getItem(C.OLD), raw);
});
test("corrupt v2 or corrupt legacy data is not silently replaced", () => {
  for (const key of [C.KEY, C.OLD]) {
    const store = memory();
    store.setItem(key, "{broken");
    const r = C.load(store, ideas);
    assert.equal(r.blocked, true);
    assert.equal(store.getItem(key), "{broken");
  }
});
test("new day has four categories and is stable across save/reload", () => {
  const s = C.initial(),
    rs = C.ensureDay(s, "2026-11-05", ideas);
  assert.equal(rs.length, 4);
  assert.equal(new Set(rs.map((r) => C.brief(r, ideas).category)).size, 4);
  rs[0].edits.pov = "Изменённый POV";
  rs[0].status = "shot";
  const store = memory();
  assert.equal(C.persist(store, s, ideas).ok, true);
  assert.deepEqual(C.load(store, ideas).state, s);
  assert.equal(C.ensureDay(s, "2026-11-05", ideas), rs);
});
test("eight slots, selected categories and recent deduplication across 14 days", () => {
  const s = C.initial();
  s.settings.count = 8;
  for (let n = 0; n < 14; n++) C.ensureDay(s, C.shift("2026-11-05", n), ideas);
  const all = Object.values(s.days).flat();
  assert.equal(all.length, 112);
  assert.equal(new Set(all.map((x) => x.ideaId)).size, 112);
  const another = C.initial();
  another.settings.categories = ["talk"];
  C.ensureDay(another, "2026-11-05", ideas).forEach((r) =>
    assert.equal(C.brief(r, ideas).category, "talk"),
  );
});
test("replacement obeys no-face restriction, excludes present day, and undo restores edits", () => {
  const s = C.initial(),
    rs = C.ensureDay(s, "2026-11-05", ideas),
    r = rs[0];
  r.edits.pov = "Личный текст";
  const before = C.clone(r);
  assert.ok(C.replace(s, r, ideas, "2026-11-05", "faceless").ok);
  assert.equal(C.brief(r, ideas).face, false);
  assert.ok(!rs.slice(1).some((x) => x.ideaId === r.ideaId));
  assert.ok(C.undo(r));
  assert.equal(r.ideaId, before.ideaId);
  assert.deepEqual(r.edits, before.edits);
});
test("replacement cannot reset stages, publications, or metrics", () => {
  for (const protectedBy of ["stage", "metrics", "publication"]) {
    const s = C.initial(),
      r = C.ensureDay(s, "2026-11-05", ideas)[0];
    if (protectedBy === "stage") r.status = "shot";
    if (protectedBy === "metrics") r.metrics.TikTok = { views: "0" };
    if (protectedBy === "publication")
      r.publications.TikTok = { url: "", at: "2026-11-05T12:00:00Z" };
    const before = C.clone(r);
    assert.ok(C.replace(s, r, ideas, "2026-11-05", "other").error);
    assert.deepEqual(r, before);
    assert.equal(C.undo(r), false);
  }
});
test("aggregation distinguishes missing from zero, compares same age and mode", () => {
  const s = C.initial(),
    rs = C.ensureDay(s, "2026-11-05", ideas);
  rs.forEach((r, i) => {
    r.metrics.TikTok = {
      snapshots: {
        24: { views: ["0", "100", "", "300"][i], mode: "Органика" },
        2: { views: "999", mode: "Органика" },
      },
    };
  });
  const rows = C.samples(s, ideas, {
    end: "2026-11-05",
    platform: "TikTok",
    age: "24",
  });
  assert.equal(rows.length, 4);
  const groups = C.aggregate(rows, "category");
  assert.equal(groups.length, 3);
  assert.equal(groups.at(-1).median, 0);
  assert.equal(C.median([0, 100, 300]), 100);
  assert.equal(C.median([]), null);
  assert.equal(C.numeric(""), null);
  assert.equal(C.numeric(0), 0);
  assert.equal(
    C.samples(s, ideas, {
      end: "2026-11-05",
      platform: "TikTok",
      age: "24",
      mode: "Реклама",
    }).length,
    0,
  );
});
test("old unknown-age measurement remains accessible after adding snapshots", () => {
  const s = C.migrate(old(), ideas),
    r = s.days["2026-11-05"][0];
  r.metrics.TikTok = {
    legacy: r.metrics.TikTok,
    snapshots: { 24: { views: "100", mode: "Органика" } },
  };
  assert.equal(
    C.samples(s, ideas, {
      end: "2026-11-05",
      platform: "TikTok",
      age: "legacy",
    })[0].m.views,
    "0",
  );
  assert.equal(
    C.samples(s, ideas, { end: "2026-11-05", platform: "TikTok", age: "24" })[0]
      .m.views,
    "100",
  );
});
test("schema rejects malformed dates, executable links, unsafe IDs and negative/nonfinite metrics", () => {
  for (const mutate of [
    (s) => (s.settings.count = 9),
    (s) => (s.settings.categories = []),
    (s) => (s.days.bad = []),
    (s) => (s.queue = [C.clone(s.days["2026-11-05"][0])]),
    (s) => (s.days["2026-11-05"][0].id = '"><img src=x>'),
    (s) =>
      (s.days["2026-11-05"][0].publications.TikTok = {
        url: "javascript:alert(1)",
        at: "",
      }),
    (s) =>
      (s.days["2026-11-05"][0].metrics.TikTok = {
        snapshots: { 24: { views: "NaN" } },
      }),
    (s) => (s.days["2026-11-05"][0].metrics.TikTok = { views: -1 }),
  ]) {
    const s = C.initial();
    C.ensureDay(s, "2026-11-05", ideas);
    mutate(s);
    assert.throws(() => C.validate(s, ideas));
  }
  assert.equal(C.dateOK("2026-02-31"), false);
});
test("save reports quota errors and never reports success", () => {
  const s = C.initial();
  assert.equal(
    C.persist(
      {
        setItem() {
          throw Error("quota");
        },
      },
      s,
      ideas,
    ).ok,
    false,
  );
});
test("trend verification needs source and date; evergreen does not pretend to be verified", () => {
  const t = C.initial().trends[0];
  assert.equal(t.status, "evergreen");
  C.validateTrend(t);
  assert.throws(() => C.validateTrend({ ...t, status: "verified" }));
  C.validateTrend({ ...t, status: "verified", checked: "2026-11-05" });
  assert.throws(() => C.validateTrend({ ...t, url: "data:text/html,evil" }));
});
test("published queue items retain analytics and legacy top-level values stay available", () => {
  const s = C.migrate(old(), ideas),
    r = s.days["2026-11-05"].shift();
  r.originDate = "2026-11-05";
  s.queue.push(r);
  assert.equal(
    C.samples(s, ideas, {
      end: "2026-11-05",
      platform: "TikTok",
      age: "legacy",
    })[0].m.views,
    "0",
  );
  assert.equal(
    C.samples(s, ideas, {
      end: "2026-11-05",
      platform: "Instagram Reels",
      age: "legacy",
    })[0].m.views,
    "8",
  );
  assert.equal(C.entries(s).length, 3);
  assert.equal(C.numeric(false), null);
});
test("malformed recent history and duplicate trend IDs are rejected", () => {
  const s = C.initial();
  s.recent = [null];
  assert.throws(() => C.validate(s, ideas));
  s.recent = [];
  s.trends.push(C.clone(s.trends[0]));
  assert.throws(() => C.validate(s, ideas));
});
test("checklist marks also protect replacement and undo", () => {
  const s = C.initial(),
    r = C.ensureDay(s, "2026-11-05", ideas)[0];
  r.checks = [0];
  const before = C.clone(r);
  assert.ok(C.replace(s, r, ideas, "2026-11-05", "faceless").error);
  assert.equal(C.undo(r), false);
  assert.deepEqual(r, before);
});
