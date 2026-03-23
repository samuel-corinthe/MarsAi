import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import PhaseCountdownBanner from "../components/phases/PhaseCountdownBanner.jsx";

const BASE_TIME = new Date("2026-03-23T12:00:00Z");

describe("PhaseCountdownBanner", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("affiche le decompte de phase 2 quand currentPhase vaut phase_2", async () => {
    render(
      <PhaseCountdownBanner
        sitePhase={{
          currentPhase: "phase_2",
          phase1EndsAt: "2026-03-30T23:59:59Z",
          phase2EndsAt: "2026-05-03T23:59:59Z",
        }}
        language="fr"
        variant="home"
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    expect(screen.getByText("Fin de phase 2")).toBeInTheDocument();
    expect(screen.getByText("Phase 3")).toBeInTheDocument();
    expect(screen.queryByText("Fin de phase 1")).not.toBeInTheDocument();
  });
});
