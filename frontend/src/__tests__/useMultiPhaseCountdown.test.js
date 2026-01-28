import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useMultiPhaseCountdown from "../hooks/useMultiPhaseCountdown.js";

const BASE_TIME = new Date("2026-01-28T12:00:00Z");

const phases = [
  { id: "p1", target: new Date(BASE_TIME.getTime() + 5000) }, // +5s
  { id: "p2", target: new Date(BASE_TIME.getTime() + 10000) }, // +10s
];

const flush = () => act(async () => vi.advanceTimersByTime(0));

describe("useMultiPhaseCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it("calcule le temps initial et choisit la première phase", async () => {
    const { result } = renderHook(() => useMultiPhaseCountdown(phases, "UTC"));
    await flush();

    expect(result.current.currentPhase.id).toBe("p1");

    // selon l arrondi ca peut etre 5 ou 4 au tout debut
    expect([4, 5]).toContain(result.current.timeLeft.seconds);
  });

  it("décrémente chaque seconde", async () => {
    const { result } = renderHook(() => useMultiPhaseCountdown(phases, "UTC"));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.currentPhase.id).toBe("p1");
    expect([1, 2]).toContain(result.current.timeLeft.seconds);
  });

  it("passe à la phase suivante quand l'échéance est atteinte", async () => {
    const { result } = renderHook(() => useMultiPhaseCountdown(phases, "UTC"));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(6000);
    });

    expect(result.current.currentPhase.id).toBe("p2");
    expect([3, 4]).toContain(result.current.timeLeft.seconds);
  });

  it("termine quand toutes les phases sont écoulées", async () => {
    const { result } = renderHook(() => useMultiPhaseCountdown(phases, "UTC"));
    await flush();

    await act(async () => {
      vi.advanceTimersByTime(11000);
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.timeLeft).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
    });
  });
});
