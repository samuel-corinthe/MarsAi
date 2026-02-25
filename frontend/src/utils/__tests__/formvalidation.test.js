import { describe, expect, it } from "vitest";
import {
  containsEmoji,
  exceedsMaxLength,
  sanitizeInput,
  validateField,
  validateForm,
} from "../formvalidation";

describe("formvalidation utils", () => {
  it("sanitizeInput nettoie espaces et balises HTML", () => {
    expect(sanitizeInput("  Bonjour   le  monde  ")).toBe("Bonjour le monde");
    expect(sanitizeInput("<b>Test</b><script>alert(1)</script>")).toBe("Testalert(1)");
    expect(sanitizeInput("")).toBe("");
  });

  it("containsEmoji detecte correctement les emojis", () => {
    expect(containsEmoji("Salut 😀")).toBe(true);
    expect(containsEmoji("Salut")).toBe(false);
  });

  it("validateField bloque un age inferieur a 18", () => {
    const result = validateField("AGE", "17");
    expect(result.isValid).toBe(false);
    expect(result.error).toContain("18 ans");
  });

  it("validateField accepte un age valide", () => {
    const result = validateField("AGE", "28");
    expect(result.isValid).toBe(true);
    expect(result.cleaned).toBe("28");
  });

  it("validateForm valide un payload complet", () => {
    const result = validateForm({
      email: "USER@Example.com",
      firstName: "Jeanne",
      lastName: "Martin",
      age: "24",
      title: "Mon Film IA",
      description: "Une description valide.",
      countryAlpha2: "fr",
      language: "Francais",
      aiTools: "Runway, Suno",
      bio: "Bio courte",
      socialWebsite: "https://example.com",
      socialInstagram: "https://instagram.com/artist",
      socialFacebook: "",
      socialX: "",
      castMembers: [{ name: "Acteur 1", role: "Principal", avatarUrl: "https://example.com/a.jpg" }],
    });

    expect(result.isValid).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.cleanedData.email).toBe("user@example.com");
    expect(result.cleanedData.countryAlpha2).toBe("FR");
    expect(result.cleanedData.aiTools).toBe("Runway, Suno");
  });

  it("validateForm remonte les erreurs critiques", () => {
    const result = validateForm({
      email: "email-invalide",
      firstName: "😀",
      lastName: "",
      age: "16",
      title: "",
      description: "ok",
      countryAlpha2: "FRA",
      language: "",
      aiTools: "a,b,c,d,e,f",
      bio: "",
      socialWebsite: "ftp://invalid",
      socialInstagram: "",
      socialFacebook: "",
      socialX: "",
      castMembers: [{ name: "Cast", role: "", avatarUrl: "" }],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.firstName).toBeTruthy();
    expect(result.errors.age).toBeTruthy();
    expect(result.errors.aiTools).toBeTruthy();
    expect(result.errors.socialWebsite).toBeTruthy();
    expect(result.errors.castMembers).toBeTruthy();
  });

  it("exceedsMaxLength detecte les depassements", () => {
    expect(exceedsMaxLength("TITLE", "x".repeat(101))).toBe(true);
    expect(exceedsMaxLength("TITLE", "x".repeat(100))).toBe(false);
  });
});
