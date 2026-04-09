/**
 * Tests — redactSecrets (logger utility)
 *
 * Audit log'a hassas veri düşmesini engelleyen maskeleme fonksiyonunu test eder.
 */
import { describe, it, expect } from "vitest";
import { redactSecrets } from "../src/utils/logger.js";

describe("redactSecrets", () => {
    // ─── OpenAI / genel sk- anahtarları ─────────────────────
    it("sk- anahtarını maskeler", () => {
        const input = "API key: sk-proj-abcdefghijklmnopqrstuvwxyz1234";
        const result = redactSecrets(input);
        expect(result).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
        expect(result).toContain("REDACTED");
    });

    it("Anthropic sk-ant- anahtarını maskeler", () => {
        const input = "sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-ABC";
        const result = redactSecrets(input);
        expect(result).not.toContain("xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
        expect(result).toContain("REDACTED");
    });

    // ─── Google / Gemini AIza anahtarı ──────────────────────
    it("AIza anahtarını maskeler", () => {
        const input = "gemini key AIzaSyDxxxxxxxxxxxxxxxxxxxxxYYYYYYY";
        const result = redactSecrets(input);
        expect(result).not.toContain("SyDxxxxxxxxxxxxxxxxxxxxxYYYYYYY");
        expect(result).toContain("REDACTED");
    });

    // ─── Bearer token ────────────────────────────────────────
    it("Bearer token'ı maskeler", () => {
        const input = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig";
        const result = redactSecrets(input);
        expect(result).not.toContain("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.payload.sig");
        expect(result).toContain("REDACTED");
    });

    // ─── Query string / URL parametreleri ───────────────────
    it("password= parametresini maskeler", () => {
        const input = "curl https://example.com/api?password=supersecret123";
        const result = redactSecrets(input);
        expect(result).not.toContain("supersecret123");
        expect(result).toContain("REDACTED");
    });

    it("token= parametresini maskeler", () => {
        const input = "https://api.example.com/endpoint?token=abcd1234efgh";
        const result = redactSecrets(input);
        expect(result).not.toContain("abcd1234efgh");
        expect(result).toContain("REDACTED");
    });

    it("api_key= parametresini maskeler", () => {
        const input = "curl 'https://x.com/q?api_key=mySecretApiKey999'";
        const result = redactSecrets(input);
        expect(result).not.toContain("mySecretApiKey999");
        expect(result).toContain("REDACTED");
    });

    // ─── Temiz içerik değiştirilmemeli ──────────────────────
    it("temiz metin değişmeden kalır", () => {
        const input = "ls -la /home/user/projects";
        expect(redactSecrets(input)).toBe(input);
    });

    it("boş string'i olduğu gibi döner", () => {
        expect(redactSecrets("")).toBe("");
    });

    it("aynı metinde birden fazla secret varsa hepsini maskeler", () => {
        const input = "key1=sk-abcdefghijk key2=AIzaSyDxxxxxxxxxYYYYY";
        const result = redactSecrets(input);
        expect(result).not.toContain("abcdefghijk");
        expect(result).not.toContain("SyDxxxxxxxxxYYYYY");
    });
});
