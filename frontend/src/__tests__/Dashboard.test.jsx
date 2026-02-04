import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Dashboard from "../pages/Dashboard.jsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockPath = path.resolve(__dirname, "../../public/mock/admin-dashboard.json");
const baseMockData = JSON.parse(readFileSync(mockPath, "utf-8"));

const FIXED_TIME = new Date("2026-02-04T12:00:00Z").getTime();

async function renderDashboard(data = baseMockData) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => data,
    })
  );

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  await screen.findByText("Dashboard Admin & Super Admin");
}

describe("Dashboard (admin)", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(FIXED_TIME);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("charge les donnees mockees et affiche le dashboard", async () => {
    await renderDashboard();

    expect(fetch).toHaveBeenCalledWith(
      "/mock/admin-dashboard.json",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(screen.getByText("Dashboard Admin & Super Admin")).toBeInTheDocument();
    expect(screen.getByText("Idriss Benali")).toBeInTheDocument();
  });

  it("permet de modifier le profil et sauvegarder", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const input = screen.getByLabelText("Nom complet");
    await user.clear(input);
    await user.type(input, "Sonia Test");

    await user.click(screen.getByRole("button", { name: "Enregistrer" }));

    expect(
      screen.getByRole("heading", { name: "Sonia Test" })
    ).toBeInTheDocument();
  });

  it("met a jour le compteur de selection", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const btn = screen.getByRole("button", {
      name: /Ajouter à la sélection/i,
    });
    const before = btn.textContent;

    await user.click(btn);

    expect(btn.textContent).not.toBe(before);
  });
});
