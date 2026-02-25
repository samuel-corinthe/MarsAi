import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  HOME_3D_OVERRIDE_STORAGE_KEY,
  getHome3DOverride,
  getInteractionPrompt,
  shouldAutoRotate,
  shouldEnableHome3D,
  shouldRenderForViewport,
} from "../homeModelViewerModel";

describe("homeModelViewerModel", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("applique correctement le filtrage viewport", () => {
    expect(shouldRenderForViewport("all", false)).toBe(true);
    expect(shouldRenderForViewport("mobile", false)).toBe(false);
    expect(shouldRenderForViewport("mobile", true)).toBe(true);
    expect(shouldRenderForViewport("desktop", true)).toBe(false);
    expect(shouldRenderForViewport("desktop", false)).toBe(true);
  });

  it("calcule correctement auto-rotate et interaction prompt", () => {
    expect(shouldAutoRotate({ reduceMotion: false, isSmallViewport: false })).toBe(true);
    expect(shouldAutoRotate({ reduceMotion: true, isSmallViewport: false })).toBe(false);
    expect(shouldAutoRotate({ reduceMotion: false, isSmallViewport: true })).toBe(false);

    expect(getInteractionPrompt(true)).toBe("auto");
    expect(getInteractionPrompt(false)).toBe("none");
  });

  it("lit correctement l'override 3D depuis le localStorage", () => {
    expect(getHome3DOverride()).toBe("auto");

    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "on");
    expect(getHome3DOverride()).toBe("on");

    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "off");
    expect(getHome3DOverride()).toBe("off");

    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "other");
    expect(getHome3DOverride()).toBe("auto");
  });

  it("respecte les overrides explicites pour activer/desactiver la 3D", () => {
    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "off");
    expect(shouldEnableHome3D({ reduceMotion: false, isSmallViewport: false })).toBe(false);

    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "on");
    expect(shouldEnableHome3D({ reduceMotion: true, isSmallViewport: true })).toBe(true);
  });

  it("desactive la 3D en mode reduce motion sans override", () => {
    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "auto");
    expect(shouldEnableHome3D({ reduceMotion: true, isSmallViewport: false })).toBe(false);
  });

  it("desactive la 3D si la connexion est limitee", () => {
    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "auto");
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "3g" },
    });

    expect(shouldEnableHome3D({ reduceMotion: false, isSmallViewport: false })).toBe(false);
  });

  it("active la 3D quand le device est suffisamment capable", () => {
    window.localStorage.setItem(HOME_3D_OVERRIDE_STORAGE_KEY, "auto");

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName === "canvas") {
        return { getContext: vi.fn(() => ({})) };
      }
      return originalCreateElement(tagName);
    });

    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      value: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
    });
    Object.defineProperty(navigator, "deviceMemory", {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, "hardwareConcurrency", {
      configurable: true,
      value: 8,
    });
    Object.defineProperty(navigator, "connection", {
      configurable: true,
      value: { saveData: false, effectiveType: "4g" },
    });

    expect(shouldEnableHome3D({ reduceMotion: false, isSmallViewport: false })).toBe(true);
  });
});
