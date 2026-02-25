import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Dashboard from "../pages/Dashboard.jsx";

vi.mock("../components/Seo.jsx", () => ({
  default: () => null,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key, fallback) => fallback || key,
    i18n: { language: "fr" },
  }),
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const mockPath = path.resolve(__dirname, "../../public/mock/admin-dashboard.json");
const baseMockData = JSON.parse(readFileSync(mockPath, "utf-8").replace(/^\uFEFF/, ""));

const FIXED_TIME = new Date("2026-02-04T12:00:00Z").getTime();

async function renderDashboard(data = baseMockData) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url) => {
      const route = String(url || "");

      if (route.includes("/api/dashboard")) {
        return {
          ok: true,
          status: 200,
          json: async () => data,
          text: async () => JSON.stringify(data),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      if (route.includes("/api/assignments/my")) {
        const payload = {
          policy: { minReviewers: 3, maxReviewers: 5 },
          assignmentByMovie: {},
          reviewerCountByMovie: {},
          myPendingMinutes: 0,
        };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      if (route.includes("/api/site-phase/phase2-selection")) {
        const payload = {
          selectedCount: 0,
          minRequired: 50,
          selectedMovies: [],
          isReadyBySuperadmin: false,
          readyByName: null,
          readyAt: null,
        };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      if (route.includes("/api/site-phase/phase3-selection")) {
        const payload = {
          selectedCount: 0,
          minRequired: 5,
          selectedMovies: [],
          isReadyBySuperadmin: false,
          readyByName: null,
          readyAt: null,
        };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      if (route.includes("/api/site-phase")) {
        const payload = {
          currentPhase: "phase_1",
          phase1EndsAt: "2026-03-29T23:59:59Z",
          phase2EndsAt: "2026-05-03T23:59:59Z",
          phase3EndsAt: "2026-06-07T23:59:59Z",
        };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      if (route.includes("/api/auth/me/profile")) {
        const payload = { user: { name: "Sonia Test" } };
        return {
          ok: true,
          status: 200,
          json: async () => payload,
          text: async () => JSON.stringify(payload),
          headers: new Headers({ "content-type": "application/json" }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({}),
        text: async () => "{}",
        headers: new Headers({ "content-type": "application/json" }),
      };
    }),
  );

  render(
    <MemoryRouter>
      <Dashboard />
    </MemoryRouter>
  );

  await screen.findByRole("heading", { name: /Bienvenue, Idriss Benali/i });
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
      "/api/dashboard",
      expect.objectContaining({ cache: "no-store" })
    );
    expect(screen.getByRole("heading", { name: /Bienvenue, Idriss Benali/i })).toBeInTheDocument();
    expect(screen.getByText("Idriss Benali")).toBeInTheDocument();
  });

  it("permet de modifier le profil et sauvegarder", async () => {
    const user = userEvent.setup();
    await renderDashboard();

    const input = screen.getByLabelText("Nom complet");
    await user.clear(input);
    await user.type(input, "Sonia Test");

    await user.click(screen.getByRole("button", { name: "Enregistrer et synchroniser" }));

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
