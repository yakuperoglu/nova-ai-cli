/**
 * Tests — provider set command atomicity
 *
 * Atomiklik regresyon testi:
 *   - Geçersiz preset verildiğinde provider state değişmemeli.
 *   - Geçerli preset verildiğinde hem provider hem baseURL kayıt edilmeli.
 *   - Geçersiz provider adı verildiğinde state değişmemeli.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as configModule from "../src/services/config.js";
import { providerSetCommand } from "../src/commands/provider.ts";

// ─── Helpers ─────────────────────────────────────────────────

function makeSpies() {
    const setProviderSpy = vi.spyOn(configModule, "setProvider");
    const setBaseURLSpy  = vi.spyOn(configModule, "setOpenAIBaseURL");
    // Suppress console output during tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    return { setProviderSpy, setBaseURLSpy };
}

beforeEach(() => {
    vi.clearAllMocks();
});

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── Invalid provider name ───────────────────────────────────

describe("providerSetCommand — geçersiz provider adı", () => {
    it("state değiştirmez (setProvider çağrılmaz)", () => {
        const { setProviderSpy } = makeSpies();
        providerSetCommand("badprovider");
        expect(setProviderSpy).not.toHaveBeenCalled();
    });
});

// ─── Invalid preset (atomicity regression) ───────────────────

describe("providerSetCommand — geçersiz preset", () => {
    it("provider state değiştirmez (setProvider çağrılmaz)", () => {
        const { setProviderSpy } = makeSpies();
        providerSetCommand("openai", { preset: "nonexistentpreset" });
        expect(setProviderSpy).not.toHaveBeenCalled();
    });

    it("baseURL state değiştirmez (setOpenAIBaseURL çağrılmaz)", () => {
        const { setBaseURLSpy } = makeSpies();
        providerSetCommand("openai", { preset: "nonexistentpreset" });
        expect(setBaseURLSpy).not.toHaveBeenCalled();
    });
});

// ─── Valid preset (happy path) ───────────────────────────────

describe("providerSetCommand — geçerli preset", () => {
    it("setProvider çağrılır", () => {
        const { setProviderSpy } = makeSpies();
        providerSetCommand("openai", { preset: "groq" });
        expect(setProviderSpy).toHaveBeenCalledWith("openai");
    });

    it("setOpenAIBaseURL groq URL'i ile çağrılır", () => {
        const { setBaseURLSpy } = makeSpies();
        providerSetCommand("openai", { preset: "groq" });
        expect(setBaseURLSpy).toHaveBeenCalledWith(
            expect.stringContaining("groq.com")
        );
    });
});

// ─── Valid provider, no preset ───────────────────────────────

describe("providerSetCommand — geçerli provider, preset yok", () => {
    it("gemini için setProvider çağrılır", () => {
        const { setProviderSpy } = makeSpies();
        providerSetCommand("gemini");
        expect(setProviderSpy).toHaveBeenCalledWith("gemini");
    });

    it("anthropic için setProvider çağrılır", () => {
        const { setProviderSpy } = makeSpies();
        providerSetCommand("anthropic");
        expect(setProviderSpy).toHaveBeenCalledWith("anthropic");
    });
});
