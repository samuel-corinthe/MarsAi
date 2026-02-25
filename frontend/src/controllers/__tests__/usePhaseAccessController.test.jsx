import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import usePhaseAccessController from "../usePhaseAccessController";
import { getCurrentSessionUser, getSitePhaseState } from "../../api";

vi.mock("../../api", () => ({
  getSitePhaseState: vi.fn(),
  getCurrentSessionUser: vi.fn(),
}));

describe("usePhaseAccessController", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("phase 1 visiteur: cache la galerie et autorise upload", async () => {
    getSitePhaseState.mockResolvedValue({ currentPhase: "phase_1" });
    getCurrentSessionUser.mockResolvedValue({ authenticated: false, user: null });

    const { result } = renderHook(() => usePhaseAccessController({ refreshKey: "a" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phaseKey).toBe("phase_1");
    expect(result.current.hasSession).toBe(false);
    expect(result.current.hasAdminSession).toBe(false);
    expect(result.current.hideGalleryForVisitors).toBe(true);
    expect(result.current.hideSubmitForVisitors).toBe(false);
    expect(result.current.isUploadAllowed).toBe(true);
  });

  it("phase 2 visiteur: cache appel projet + upload", async () => {
    getSitePhaseState.mockResolvedValue({ currentPhase: "phase_2" });
    getCurrentSessionUser.mockResolvedValue({ authenticated: false, user: null });

    const { result } = renderHook(() => usePhaseAccessController({ refreshKey: "b" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phaseKey).toBe("phase_2");
    expect(result.current.hideCallForProjects).toBe(true);
    expect(result.current.hideSubmitForVisitors).toBe(true);
    expect(result.current.isUploadAllowed).toBe(false);
  });

  it("phase 2 admin: upload autorise", async () => {
    getSitePhaseState.mockResolvedValue({ currentPhase: "phase_2" });
    getCurrentSessionUser.mockResolvedValue({
      authenticated: true,
      user: { role: "admin" },
    });

    const { result } = renderHook(() => usePhaseAccessController({ refreshKey: "c" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.hasSession).toBe(true);
    expect(result.current.hasAdminSession).toBe(true);
    expect(result.current.hideSubmitForVisitors).toBe(false);
    expect(result.current.isUploadAllowed).toBe(true);
  });

  it("fallback erreur API: mode phase_1 permissif", async () => {
    getSitePhaseState.mockRejectedValue(new Error("boom"));
    getCurrentSessionUser.mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => usePhaseAccessController({ refreshKey: "d" }));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.phaseKey).toBe("phase_1");
    expect(result.current.hasSession).toBe(false);
    expect(result.current.hasAdminSession).toBe(false);
    expect(result.current.hideCallForProjects).toBe(false);
    expect(result.current.hideGalleryForVisitors).toBe(false);
    expect(result.current.hideSubmitForVisitors).toBe(false);
    expect(result.current.isUploadAllowed).toBe(true);
  });
});
