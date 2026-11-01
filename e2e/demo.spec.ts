import { expect, test } from "@playwright/test";

const DEMO_SLIDES = 10;

function currentSlide(page: import("@playwright/test").Page) {
  return page.locator("[data-slide]").getAttribute("data-slide");
}

for (const locale of ["pl", "en"]) {
  test(`every ${locale} slide fits the screen`, async ({ page }, testInfo) => {
    await page.goto(`/${locale}/demo`);
    await page.keyboard.press(" ");

    for (let slide = 0; slide < DEMO_SLIDES; slide += 1) {
      const section = page.locator("[data-slide]");
      await expect(section).toBeVisible();
      await page.waitForTimeout(1600);

      const overflow = await section.evaluate(
        (node) => node.scrollHeight - node.clientHeight,
      );
      expect(overflow, await currentSlide(page) ?? "").toBeLessThanOrEqual(1);

      if (process.env.SCREENSHOT_DIR) {
        await page.screenshot({
          path: `${process.env.SCREENSHOT_DIR}/${locale}-${testInfo.project.name}-${slide}.png`,
        });
      }
      await page.keyboard.press("ArrowRight");
    }
  });
}

test("controls move between slides", async ({ page }) => {
  await page.goto("/en/demo");
  await page.keyboard.press(" ");
  await expect(page.locator('[data-slide="opening"]')).toBeVisible();

  await page.keyboard.press("ArrowRight");
  await expect(page.locator('[data-slide="hours"]')).toBeVisible();

  await page.keyboard.press("ArrowLeft");
  await expect(page.locator('[data-slide="opening"]')).toBeVisible();
});

test("slides advance on their own until paused", async ({ page }) => {
  test.setTimeout(30_000);
  await page.goto("/en/demo");
  await expect(page.locator('[data-slide="hours"]')).toBeVisible({
    timeout: 12_000,
  });

  await page.getByRole("button", { name: "Pause" }).click();
  await page.waitForTimeout(9_000);
  await expect(page.locator('[data-slide="hours"]')).toBeVisible();
});

test("tapping the sides moves between slides", async ({ page }) => {
  await page.goto("/en/demo");
  await page.keyboard.press(" ");
  const frame = await page.locator("[data-slide]").boundingBox();
  if (!frame) throw new Error("No slide frame");
  const y = frame.y + frame.height / 2;

  await page.mouse.click(frame.x + frame.width * 0.8, y);
  await expect(page.locator('[data-slide="hours"]')).toBeVisible();

  await page.mouse.click(frame.x + frame.width * 0.1, y);
  await expect(page.locator('[data-slide="opening"]')).toBeVisible();
});

test("a long press does not change the slide", async ({ page }) => {
  await page.goto("/en/demo");
  await page.keyboard.press(" ");
  const frame = await page.locator("[data-slide]").boundingBox();
  if (!frame) throw new Error("No slide frame");

  await page.mouse.move(frame.x + frame.width * 0.8, frame.y + frame.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(300);
  await expect(page.locator('[data-slide="opening"]')).toBeVisible();
});

test.describe("with reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("slides only change on request", async ({ page }) => {
    test.setTimeout(30_000);
    await page.goto("/en/demo");
    await page.waitForTimeout(10_000);
    await expect(page.locator('[data-slide="opening"]')).toBeVisible();

    await page.keyboard.press("ArrowRight");
    await expect(page.locator('[data-slide="hours"]')).toBeVisible();
  });
});

test("close leaves the deck", async ({ page }) => {
  await page.goto("/en/demo");
  await page.getByRole("link", { name: "Close" }).click();
  await expect(page).toHaveURL(/\/en$/);
});
