import { describe, expect, it } from "vitest";
import { validateVideoFrontend } from "../videoValidation";

describe("videoValidation", () => {
  it("accepte une video conforme", () => {
    const result = validateVideoFrontend({
      fileSize: 100 * 1024 * 1024,
      type: "video/mp4",
      duration: 60,
      aspectRatio: 16 / 9,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("refuse une video non conforme (poids, type, duree, ratio)", () => {
    const result = validateVideoFrontend({
      fileSize: 500 * 1024 * 1024,
      type: "video/webm",
      duration: 10,
      aspectRatio: 1.2,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBe(4);
    expect(result.errors.some((error) => error.includes("300 MB"))).toBe(true);
    expect(result.errors.some((error) => error.includes("MP4"))).toBe(true);
    expect(result.errors.some((error) => error.includes("entre 45s et 100s"))).toBe(true);
    expect(result.errors.some((error) => error.includes("16:9"))).toBe(true);
  });
});
