import { browser } from "k6/browser";
import { check } from "k6";

export const options = {
  scenarios: {
    participants: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 25 },
        { duration: "30s", target: 50 },
        { duration: "1m", target: 100 },
        { duration: "1m", target: 200 },
        { duration: "30s", target: 200 },
        { duration: "30s", target: 0 },
      ],
      gracefulRampDown: "30s",
    },
  },

  thresholds: {
    checks: ["rate>0.95"],
    browser_http_req_failed: ["rate<0.05"],
  },
};

const BASE_URL = "https://semi-tag-switched-set.trycloudflare.com";

export default async function () {
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // 1. Open registration page
    await page.goto(BASE_URL, {
      waitUntil: "networkidle",
    });

    check(page, {
      "registration page loaded": (p) => p.url().includes("trycloudflare.com"),
    });

    // 2. Generate a unique participant
    const id = `${__VU}_${__ITER}_${Date.now()}`;

    const name = `LoadTest ${id}`;
    const phone = `+91 9${String(__VU).padStart(2, "0")}${String(__ITER).padStart(6, "0")}`;

    // 3. Fill registration form
    //
    // CHANGE THESE SELECTORS TO MATCH YOUR WEBSITE
    await page.locator('input[name="name"]').fill(name);
    await page.locator('input[name="phone"]').fill(phone);

    // 4. Submit registration
    //
    // CHANGE THIS SELECTOR IF NECESSARY
    await page.locator('button[type="submit"]').click();

    // 5. Wait for quiz page
    await page.waitForLoadState("networkidle");

    check(page, {
      "redirected to quiz": (p) => p.url().includes("/quiz"),
    });

    // 6. Wait for quiz to load
    await page.waitForTimeout(1000);

    /*
     * QUIZ ANSWERING
     *
     * Replace this section with the actual selectors
     * for your answer buttons/options.
     *
     * Example:
     *
     * const options = page.locator('[data-option]');
     * await options.nth(0).click();
     *
     * Then submit/next.
     */

    // Example placeholder:
    // await page.locator('[data-option]').first().click();
    // await page.locator('button:has-text("Next")').click();

    // 7. Eventually navigate to Hands-On Debug
    //
    // Replace with your actual interaction.
    //
    // await page.locator('button:has-text("Submit")').click();
    // await page.waitForLoadState("networkidle");

    check(page, {
      "quiz page accessible": (p) => p.url().includes("/quiz"),
    });

  } finally {
    await page.close();
    await context.close();
  }
}