const { chromium } = require("playwright"),
  assert = require("node:assert/strict"),
  fs = require("node:fs");
const base = process.env.SNIPPETS_URL || "http://127.0.0.1:8765/snippets/";
fs.mkdirSync("work", { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
    args: ["--no-sandbox"],
  });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const p = await ctx.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto(base);
  await p.waitForSelector(".cards .card");
  const title = await p.title();
  assert.equal(title, "РИТМ · Контент");
  assert.equal(await p.locator(".cards .card").count(), 4);
  const first = p.locator(".cards .card").first();
  const orig = await first.locator("h3").textContent();
  await first
    .getByRole("button", { name: "Копировать POV", exact: true })
    .click();
  assert.ok(
    (await p.evaluate(() => navigator.clipboard.readText())).includes("клиент"),
  );
  await first.getByRole("button", { name: "Другая идея", exact: true }).click();
  await p.getByRole("button", { name: "Без лица", exact: true }).click();
  assert.notEqual(await first.locator("h3").textContent(), orig);
  assert.ok((await first.textContent()).includes("без лица"));
  await first
    .getByRole("button", { name: "Отменить замену", exact: true })
    .click();
  assert.equal(await first.locator("h3").textContent(), orig);
  await first.getByRole("button", { name: "Сценарий ↗", exact: true }).click();
  await p.getByRole("button", { name: "Редактировать тексты" }).click();
  await p.locator("[name=pov]").fill("Мой проверочный POV");
  await p.getByRole("button", { name: "Сохранить тексты" }).click();
  await first.getByRole("button", { name: "Снял", exact: true }).click();
  await p.reload();
  await p.waitForSelector(".cards .card");
  assert.ok((await first.textContent()).includes("Мой проверочный POV"));
  assert.equal(await first.locator("select").inputValue(), "shot");
  await first.getByRole("button", { name: "Смонтировал", exact: true }).click();
  await first.getByRole("button", { name: "Опубликовал", exact: true }).click();
  await p.locator("[name=url]").fill("https://www.tiktok.com/@test/video/123");
  await p.getByRole("button", { name: "Отметить опубликованным" }).click();
  await first.getByRole("button", { name: "Результат", exact: true }).click();
  await p.locator("[name=views]").fill("100");
  await p.locator("[name=likes]").fill("10");
  await p.getByRole("button", { name: "Сохранить замер" }).click();
  await p.getByRole("button", { name: "Статистика", exact: true }).click();
  assert.ok((await p.locator("#app").textContent()).includes("100"));
  await p.screenshot({ path: "work/stats-mobile.png", fullPage: true });
  await p.getByRole("button", { name: "Идеи", exact: true }).click();
  await p.locator("[data-filter=face]").selectOption("no");
  assert.ok((await p.locator("#ideaCards .card").count()) > 0);
  assert.ok((await p.locator("#ideaCards").textContent()).includes("без лица"));
  await p.locator("#search").fill("ритм");
  await p.screenshot({ path: "work/ideas-mobile.png", fullPage: true });
  await p.getByRole("button", { name: "Варианты POV / хуков" }).click();
  await p.locator("[name=topic]").fill("кофе перед записью");
  await p.getByRole("button", { name: "Собрать варианты" }).click();
  assert.equal(await p.locator("#generated .copy-block").count(), 3);
  await p.getByRole("button", { name: "Закрыть", exact: true }).click();
  await p.getByRole("button", { name: "Тренды", exact: true }).click();
  await p.getByRole("button", { name: "Добавить механику" }).click();
  await p.locator("[name=title]").fill("Мой проверенный приём");
  await p.locator("[name=mechanic]").fill("Один понятный переход");
  await p.locator("[name=pov]").fill("Когда записал хороший дубль");
  await p.locator("[name=query]").fill("music before after");
  await p.locator("[name=checked]").fill("2026-11-05");
  await p.locator("[name=status]").selectOption("verified");
  await p.getByRole("button", { name: "Сохранить механику" }).click();
  assert.ok(
    (await p.locator("#app").textContent()).includes("Проверено вручную"),
  );
  await p.screenshot({ path: "work/trends-mobile.png", fullPage: true });
  await p.getByRole("button", { name: "План", exact: true }).click();
  await p.getByRole("button", { name: "Заполнить пустые дни" }).click();
  assert.equal(await p.locator(".calendar-day").count(), 14);
  await p.screenshot({ path: "work/plan-mobile.png", fullPage: true });
  await p.getByRole("button", { name: "Сегодня", exact: true }).click();
  await p.getByRole("button", { name: "Сегодня мало сил" }).click();
  assert.equal(await p.locator(".cards .card").count(), 2);
  await p.getByRole("button", { name: "Вернуть полный план" }).click();
  assert.equal(await p.locator(".cards .card").count(), 4);
  await p.getByRole("button", { name: "Настройки", exact: true }).click();
  await p.locator("[name=count]").fill("8");
  await p.locator("[name=apply]").check();
  await p.getByRole("button", { name: "Сохранить настройки" }).click();
  assert.equal(await p.locator(".cards .card").count(), 8);
  await p.getByRole("button", { name: "Настройки", exact: true }).click();
  await p.locator("[name=count]").fill("4");
  await p.locator("[name=apply]").check();
  await p.getByRole("button", { name: "Сохранить настройки" }).click();
  assert.equal(await p.locator(".cards .card").count(), 4);
  assert.equal(
    await p.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
  );
  await p.locator("#toast").evaluate((e) => (e.style.display = "none"));
  await p.screenshot({ path: "work/today-mobile.png", fullPage: true });
  await p.setViewportSize({ width: 1440, height: 1000 });
  await p.screenshot({ path: "work/today-desktop.png", fullPage: true });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller);
  await ctx.setOffline(true);
  await p.reload();
  await p.waitForSelector(".cards .card");
  assert.equal(await p.locator(".cards .card").count(), 4);
  await ctx.setOffline(false);
  await p.getByRole("button", { name: "Идеи", exact: true }).click();
  await p.getByRole("button", { name: "Сбросить фильтры" }).click();
  const lib = p.locator("#ideaCards .card").first();
  await lib.locator("[data-fav]").click();
  await p.locator("[data-filter=scope]").selectOption("favorites");
  assert.equal(await p.locator("#ideaCards .card").count(), 1);
  await p
    .locator("#ideaCards .card")
    .first()
    .getByRole("button", { name: "В день / очередь" })
    .click();
  await p.locator("[name=target]").selectOption("queue");
  await p.getByRole("button", { name: "Добавить", exact: true }).click();
  await p.getByRole("button", { name: "План", exact: true }).click();
  const queued = p
    .locator(".panel")
    .filter({ has: p.getByRole("heading", { name: /Очередь/ }) });
  assert.ok((await queued.textContent()).includes("Свести на пять минут"));
  await queued.getByRole("button", { name: "Назначить" }).click();
  await p
    .getByRole("button", { name: "Перенести с сохранением этапов" })
    .click();
  await p.getByRole("button", { name: "Настройки", exact: true }).click();
  const dl = await Promise.all([
    p.waitForEvent("download"),
    p.getByRole("button", { name: "Экспорт JSON" }).click(),
  ]);
  await dl[0].saveAs("work/browser-export.json");
  const before = await p.evaluate(() =>
    localStorage.getItem("ritm-content-v2"),
  );
  await p.locator("#import").setInputFiles("work/browser-export.json");
  await p.waitForFunction(() => !document.querySelector("#modal").open);
  assert.equal(
    await p.evaluate(() => localStorage.getItem("ritm-content-v2")),
    before,
  );
  const ctx2 = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    p2 = await ctx2.newPage();
  await p2.addInitScript(() => {
    if (!localStorage.getItem("seeded")) {
      localStorage.setItem(
        "ritm-snippets-v1",
        JSON.stringify({
          track: "Старый трек",
          hook: "Старая строка",
          times: ["11:00", "16:00", "20:00"],
          days: {
            "2026-11-05": [
              {
                format: 0,
                done: true,
                metrics: { TikTok: { views: "0", shares: "0" } },
              },
              {
                format: 1,
                done: false,
                metrics: {
                  TikTok: {
                    snapshots: { 48: { views: "456", mode: "Органика" } },
                  },
                },
              },
              { format: 2, done: false, metrics: {} },
            ],
          },
        }),
      );
      localStorage.setItem("seeded", "1");
    }
  });
  p2.on("pageerror", (e) => errors.push(e.message));
  await p2.goto(base);
  await p2.locator('[data-date="2026-11-05"]').click();
  assert.equal(await p2.locator(".cards .card").count(), 3);
  assert.ok((await p2.locator("#app").textContent()).includes("Старая строка"));
  await p2
    .locator(".cards .card")
    .first()
    .getByRole("button", { name: "Результат", exact: true })
    .click();
  await p2.locator("#metricAge").selectOption("legacy");
  assert.equal(await p2.locator("[name=views]").inputValue(), "0");
  await p2.getByRole("button", { name: "Закрыть", exact: true }).click();
  await p2.screenshot({ path: "work/migrated-mobile.png", fullPage: true });
  assert.ok(await p2.evaluate(() => localStorage.getItem("ritm-snippets-v1")));
  const ctx3 = await browser.newContext({
      viewport: { width: 390, height: 844 },
    }),
    p3 = await ctx3.newPage();
  await p3.goto(base);
  await p3.waitForSelector(".cards .card");
  await p3.screenshot({ path: "work/fresh-mobile.png", fullPage: true });
  await p3.setViewportSize({ width: 1440, height: 1000 });
  await p3.screenshot({ path: "work/fresh-desktop.png", fullPage: true });
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({
      result: "PASS",
      checks: [
        "fresh mobile",
        "copy",
        "replace and undo",
        "edit persistence",
        "stages",
        "publication URL",
        "metrics and charts",
        "faceless and search",
        "generator",
        "trend edit",
        "14-day plan",
        "low energy",
        "1–8 settings",
        "390px overflow",
        "desktop",
        "offline reload",
        "legacy migration and zero metric",
        "favorites",
        "queue assignment",
        "export/import roundtrip",
      ],
      errors,
    }),
  );
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
