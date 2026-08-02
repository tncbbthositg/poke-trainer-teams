import { expect, test } from "@playwright/test";

test("loads the pokemon explorer shell by default", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Rocket Pair Lab" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Pokemon Explorer" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Pokemon" })).toHaveAttribute(
    "aria-current",
    "page",
  );
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
    page.getByRole("heading", { name: "Proxy Battle Estimate", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Proxy Estimate Result" }),
  ).toBeVisible();
  await expect(page.getByLabel("Lead Pokemon")).toHaveValue("kingambit");
  await expect(page.getByText("Pokemon Level 40")).toBeVisible();
  await expect(page.getByText("Kingambit · CP 3,614 · 189 HP")).toBeVisible();
  await page.getByLabel("Backup Pokemon").selectOption("lucario");
  await expect(page.getByText("Lucario backup")).toBeVisible();
  await expect(page.getByLabel("Strategy")).toHaveValue("fastest-victory");
  await expect(page.getByLabel("Charged 1").nth(1)).toHaveValue("BLAZE_KICK");
  await page.getByLabel("Strategy").selectOption("charged-pause-control");
  await expect(page.getByLabel("Charged 1").nth(1)).toHaveValue(
    "POWER_UP_PUNCH",
  );
  await expect(page.getByLabel("Fast move").first()).toBeVisible();
  await expect(page.getByLabel("Charged 1").first()).toBeVisible();
  await expect(page.getByLabel("Charged 2").first()).toBeVisible();
  await expect(page.getByLabel("Rocket Lineup")).toBeVisible();
  await expect(page.getByText("Proxy estimate", { exact: true })).toBeVisible();
  await expect(page.getByText(/^(Proxy clear|Proxy fail)$/)).toBeVisible();
  await expect(page.getByText(/Universal proxy (clear|fail)/)).toBeVisible();
  await expect(page.getByText("not a verified Rocket result")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Timeline" })).toBeVisible();
  await expect(
    page.getByLabel(/Battle timeline from 0.0 seconds/),
  ).toBeVisible();
  await expect(page.getByLabel("Player active Pokemon")).toBeVisible();
  await expect(page.getByLabel(/Kingambit active from/).first()).toBeVisible();
  await expect(page.getByLabel("Player fast attack triggers")).toBeVisible();
  await expect(page.getByLabel("Player charged attack spans")).toBeVisible();
  await expect(page.getByLabel("Player shield uses")).toBeVisible();
  await expect(page.getByLabel("Opponent fast attack triggers")).toBeVisible();
  await expect(page.getByLabel("Opponent charged attack spans")).toBeVisible();
  await expect(page.getByLabel("Opponent shield uses")).toBeVisible();
  await expect(page.getByLabel("Opponent active Pokemon")).toBeVisible();
  await expect(page.getByLabel(/Persian active from/).first()).toBeVisible();
  await page.getByLabel(/Battle timeline from 0.0 seconds/).hover({
    position: { x: 260, y: 130 },
  });
  await expect(page.getByRole("status")).toContainText("Player HP:");
  await expect(page.getByRole("status")).toContainText("Opponent HP:");
});

test("loads the battle timeline event log", async ({ page }) => {
  await page.goto("/#/timeline");
  await expect(
    page.getByRole("heading", { name: "Battle Timeline" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Timeline" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByLabel("Lead", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Backup", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Event Log" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Turn" })).toBeVisible();
  await expect(
    page.getByRole("cell", { name: "Pokemon Enter" }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Assumptions" }),
  ).toBeVisible();
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

test("sets a battle team from pokemon explorer row icons", async ({ page }) => {
  await page.goto("/#/pokemon");
  await page.getByRole("checkbox", { name: "Hide scarce candy" }).uncheck();
  await page.getByRole("button", { name: "Set Mewtwo as player 1" }).click();
  await page.getByRole("button", { name: "Set Lucario as player 2" }).click();

  await expect(
    page.getByRole("button", { name: "Mewtwo is player 1" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Lucario is player 2" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Battle with selected team" }).click();
  await expect(page).toHaveURL(/#\/pairs\?lead=mewtwo&backup=lucario/);
  await expect(
    page.getByRole("heading", { name: "Proxy Battle Estimate", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Lead Pokemon")).toHaveValue("mewtwo");
  await expect(page.getByLabel("Backup Pokemon")).toHaveValue("lucario");
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
