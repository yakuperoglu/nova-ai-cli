/**
 * Tests — inferProviderFromApiKey
 *
 * API anahtarı önekinden sağlayıcı tahminini doğrular.
 */
import { describe, it, expect } from "vitest";
import { inferProviderFromApiKey } from "../src/utils/inferProviderFromApiKey.js";

describe("inferProviderFromApiKey", () => {
    // ─── Anthropic ──────────────────────────────────────────
    it("sk-ant- önekini anthropic olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx")).toBe("anthropic");
    });

    it("sk-ant önekini (kısa) anthropic olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-antABC123def456")).toBe("anthropic");
    });

    // ─── OpenAI ─────────────────────────────────────────────
    it("sk-proj- önekini openai olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-proj-abcdef1234567890ABCDEF")).toBe("openai");
    });

    it("sk-svcacct- önekini openai olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-svcacct-abc123")).toBe("openai");
    });

    it("sk-org- önekini openai olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-org-myorgkey123")).toBe("openai");
    });

    it("genel sk- önekini (ant olmayan) openai olarak tanır", () => {
        expect(inferProviderFromApiKey("sk-abcdefghijklmnopqrstuvwxyz123456")).toBe("openai");
    });

    // ─── Gemini ─────────────────────────────────────────────
    it("AIza önekini gemini olarak tanır", () => {
        expect(inferProviderFromApiKey("AIzaSyDxxxxxxxxxxxxxxxxxxxxxYYYYYYY")).toBe("gemini");
    });

    // ─── Varsayılan (gemini) ─────────────────────────────────
    it("bilinmeyen format için gemini döner", () => {
        expect(inferProviderFromApiKey("someRandomUnknownKeyFormat")).toBe("gemini");
    });

    it("boş string için gemini döner", () => {
        expect(inferProviderFromApiKey("")).toBe("gemini");
    });

    it("sadece boşluk için gemini döner", () => {
        expect(inferProviderFromApiKey("   ")).toBe("gemini");
    });

    // ─── Büyük-küçük harf duyarsızlık ───────────────────────
    it("büyük harfli SK-ANT- önekini anthropic olarak tanır", () => {
        expect(inferProviderFromApiKey("SK-ANT-API03-xxxxx")).toBe("anthropic");
    });

    it("karışık büyük-küçük SK-Proj- önekini openai olarak tanır", () => {
        expect(inferProviderFromApiKey("SK-Proj-xyz123")).toBe("openai");
    });
});
