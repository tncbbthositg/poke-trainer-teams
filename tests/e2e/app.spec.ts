import { expect, test } from "@playwright/test";

test("loads the data explorer shell", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Rocket Pair Lab" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Pokemon" }).click();
  await expect(
    page.getByRole("heading", { name: "Pokemon Explorer" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/#\/pokemon$/);
  await expect(page.getByText("Kingambit")).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Hide scarce candy" }),
  ).toBeChecked();
  await expect(page.getByText("Mewtwo")).not.toBeVisible();
});

test("loads shared deep links", async ({ page }) => {
  await page.goto("/#/methodology");
  await expect(
    page.getByRole("heading", { name: "Methodology and Sources" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Methodology" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("supports overriding the theme mode", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator(".dark").first()).toBeVisible();
  await page.getByRole("button", { name: "Light theme" }).click();
  await expect(page.locator(".dark")).toHaveCount(0);
  await page.getByRole("button", { name: "Dark theme" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Dark theme" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "System theme" }).click();
  await expect(
    page.getByRole("button", { name: "System theme" }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("supports picking a battle team", async ({ page }) => {
  await page.goto("/#/pairs");
  await expect(
    page.getByRole("heading", { name: "Battle Simulation", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Battle Simulation Result" }),
  ).toBeVisible();
  await expect(page.getByLabel("Lead Pokemon")).toHaveValue("kingambit");
  await page.getByLabel("Backup Pokemon").selectOption("lucario");
  await expect(page.getByText("Lucario backup")).toBeVisible();
  await expect(page.getByLabel("Fast move").first()).toBeVisible();
  await expect(page.getByLabel("Charged 1").first()).toBeVisible();
  await expect(page.getByLabel("Charged 2").first()).toBeVisible();
  await expect(page.getByLabel("Rocket Lineup")).toBeVisible();
  await expect(page.getByText("Experimental simulation")).toBeVisible();
  await expect(page.getByText(/^(Win|Loss)$/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(
    page.getByLabel(/Battle timeline from 0.0 seconds/),
  ).toBeVisible();
  await expect(page.getByLabel("Player active Pokemon")).toBeVisible();
  await expect(page.getByLabel(/Kingambit active from/).first()).toBeVisible();
  await expect(page.getByLabel("Player fast attack triggers")).toBeVisible();
  await expect(page.getByLabel(/Snarl fast attack from/).first()).toBeVisible();
  await expect(page.getByLabel("Player charged attack spans")).toBeVisible();
  await expect(
    page.getByLabel(/Dark Pulse charged attack from/).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Player shield uses")).toBeVisible();
  await expect(page.getByLabel("Opponent fast attack triggers")).toBeVisible();
  await expect(
    page.getByLabel(/Persian fast attack from/).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Opponent charged attack spans")).toBeVisible();
  await expect(
    page.getByLabel(/Play Rough charged attack from/).first(),
  ).toBeVisible();
  await expect(page.getByLabel("Opponent shield uses")).toBeVisible();
  await expect(page.getByLabel("Opponent active Pokemon")).toBeVisible();
  await expect(page.getByLabel(/Persian active from/).first()).toBeVisible();
});

test("links explorer rows to moveset option A", async ({ page }) => {
  await page.goto("/#/pokemon");
  await page.getByRole("checkbox", { name: "Hide scarce candy" }).uncheck();
  await page.getByRole("link", { name: "Compare Mewtwo moveset" }).click();
  await expect(page).toHaveURL(/#\/movesets\?/);
  await expect(
    page.getByRole("heading", { name: "Moveset Comparator" }),
  ).toBeVisible();
  await expect(page.getByLabel("Pokemon")).toHaveValue("mewtwo");
  await expect(page.getByLabel("Build A fast")).toHaveValue("PSYCHO_CUT");
  await expect(page.getByLabel("Build A Charged 1")).toHaveValue("PSYSTRIKE");
  await expect(page.getByLabel("Build A Charged 2")).toHaveValue(
    "FLAMETHROWER",
  );
});

test("keeps pokemon explorer controls after visiting movesets", async ({
  page,
}) => {
  await page.goto("/#/pokemon");
  await page.getByLabel("Strategy").selectOption("practical-spam");
  await page.getByLabel("Filter Pokemon table").fill("mew");
  await page.getByRole("checkbox", { name: "Hide scarce candy" }).uncheck();

  await page.getByRole("link", { name: "Compare Mewtwo moveset" }).click();
  await expect(
    page.getByRole("heading", { name: "Moveset Comparator" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Pokemon" }).click();
  await expect(
    page.getByRole("heading", { name: "Pokemon Explorer" }),
  ).toBeVisible();
  await expect(page.getByLabel("Strategy")).toHaveValue("practical-spam");
  await expect(page.getByLabel("Filter Pokemon table")).toHaveValue("mew");
  await expect(
    page.getByRole("checkbox", { name: "Hide scarce candy" }),
  ).not.toBeChecked();
});
