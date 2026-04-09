/**
 * Tests — Security: separator-aware chained command validation
 *
 * Zincirlenmiş komutlarda (;  &&  ||  |) tehlikeli segmentlerin
 * tespit edildiğini doğrular.
 */
import { describe, it, expect } from "vitest";
import { validateCommand } from "../src/utils/security.js";

// ─── && ile zincirleme ───────────────────────────────────────

describe("validateCommand — && ile zincirleme", () => {
    it("ls && rm -rf / → blocked (yıkıcı segment)", () => {
        const r = validateCommand("ls && rm -rf /");
        expect(r.level).toBe("blocked");
    });

    it("npm install && npm run build → safe", () => {
        const r = validateCommand("npm install && npm run build");
        expect(r.level).toBe("safe");
    });

    it("git pull && sudo npm install → warning (sudo segment)", () => {
        const r = validateCommand("git pull && sudo npm install");
        expect(r.level).toBe("warning");
    });

    it("echo hello && format C: → blocked", () => {
        const r = validateCommand("echo hello && format C:");
        expect(r.level).toBe("blocked");
    });
});

// ─── ; ile zincirleme ────────────────────────────────────────

describe("validateCommand — ; ile zincirleme", () => {
    it("cd /tmp; rm -rf / → blocked", () => {
        const r = validateCommand("cd /tmp; rm -rf /");
        expect(r.level).toBe("blocked");
    });

    it("echo a; echo b → safe", () => {
        const r = validateCommand("echo a; echo b");
        expect(r.level).toBe("safe");
    });

    it("echo a; kill -9 1234 → warning", () => {
        const r = validateCommand("echo a; kill -9 1234");
        expect(r.level).toBe("warning");
    });
});

// ─── | pipe zincirleme ───────────────────────────────────────

describe("validateCommand — | pipe zincirleme", () => {
    it("cat /etc/passwd | nc -lvp 4444 → blocked (nc reverse shell)", () => {
        const r = validateCommand("cat /etc/passwd | nc -lvp 4444");
        expect(r.level).toBe("blocked");
    });

    it("ls -la | grep .ts → safe", () => {
        const r = validateCommand("ls -la | grep .ts");
        expect(r.level).toBe("safe");
    });
});

// ─── || ile zincirleme ───────────────────────────────────────

describe("validateCommand — || ile zincirleme", () => {
    it("npm test || shutdown → blocked", () => {
        const r = validateCommand("npm test || shutdown");
        expect(r.level).toBe("blocked");
    });

    it("npm test || echo failed → safe", () => {
        const r = validateCommand("npm test || echo failed");
        expect(r.level).toBe("safe");
    });
});

// ─── Quoted arguments must NOT be split ─────────────────────

describe("validateCommand — tırnak içi separator korunmalı", () => {
    it('git commit -m "feat: fix && add tests" → safe', () => {
        const r = validateCommand('git commit -m "feat: fix && add tests"');
        expect(r.level).toBe("safe");
    });

    it("echo 'hello; world' → safe", () => {
        const r = validateCommand("echo 'hello; world'");
        expect(r.level).toBe("safe");
    });
});

// ─── Tek komut davranışı değişmemeli ────────────────────────

describe("validateCommand — tek komut regression", () => {
    it("rm -rf / hâlâ blocked", () => {
        expect(validateCommand("rm -rf /").level).toBe("blocked");
    });

    it("sudo apt update hâlâ warning", () => {
        expect(validateCommand("sudo apt update").level).toBe("warning");
    });

    it("git status hâlâ safe", () => {
        expect(validateCommand("git status").level).toBe("safe");
    });
});
