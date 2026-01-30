import { test, expect } from "@playwright/test";

test("dashboard to pipeline apply fix", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByText("Overview")).toBeVisible();

  await page.goto("/pipelines");
  await expect(page.getByText("Pipelines")).toBeVisible();

  await page.getByRole("link", { name: "payments-service-prod" }).click();

  await expect(page.getByText("Stage flow")).toBeVisible();

  await page.getByRole("button", { name: "View insight" }).click();
  await expect(page.getByText("System Insight")).toBeVisible();

  await page.getByRole("button", { name: "Apply Fix" }).click();
  await page.getByRole("button", { name: "Confirm" }).click();

  await expect(page.getByText("Fix applied.")).toBeVisible();
});
