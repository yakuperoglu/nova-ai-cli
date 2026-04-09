/**
 * Tests — Audit logger NDJSON format tutarlılığı
 *
 * appendLog'un NDJSON formatında yazdığını doğrular.
 * fs.appendFileSync spy'lanarak yazdırılan içerik yakalanır —
 * gerçek diskin durumundan bağımsız, deterministik testler.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";

// ─── Helpers ─────────────────────────────────────────────────

let capturedWrites: string[] = [];

function setupFsSpy() {
    capturedWrites = [];
    // mkdirSync ve chmodSync'i pasif yap, appendFileSync'i yakala
    vi.spyOn(fs, "mkdirSync").mockReturnValue(undefined);
    vi.spyOn(fs, "existsSync").mockReturnValue(true);
    vi.spyOn(fs, "chmodSync").mockReturnValue(undefined);
    vi.spyOn(fs, "appendFileSync").mockImplementation((_file, data) => {
        capturedWrites.push(data as string);
    });
}

beforeEach(() => {
    setupFsSpy();
});

afterEach(() => {
    vi.restoreAllMocks();
    capturedWrites = [];
});

// ─── Tests ───────────────────────────────────────────────────

describe("appendLog — NDJSON format", () => {
    it("her yazım geçerli JSON'a parse edilebilmeli", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("list files", "ls -la", "SUCCESS");
        appendLog("delete tmp", "rm -rf /tmp/x", "CANCELLED");
        appendLog("run tests", "npm test", "FAILED", "exit code 1");

        expect(capturedWrites).toHaveLength(3);
        for (const write of capturedWrites) {
            // her write "\n" ile bitiyor; JSON parse için trim et
            expect(() => JSON.parse(write.trim())).not.toThrow();
        }
    });

    it("timestamp, status, prompt, command alanları bulunmalı", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("my prompt", "my command", "SUCCESS");

        expect(capturedWrites).toHaveLength(1);
        const entry = JSON.parse(capturedWrites[0].trim());
        expect(entry).toMatchObject({
            status: "SUCCESS",
            prompt: "my prompt",
            command: "my command",
        });
        expect(typeof entry.timestamp).toBe("string");
        expect(entry.timestamp.length).toBeGreaterThan(0);
    });

    it("FAILED entry'e error alanı eklenmeli", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("test", "npm test", "FAILED", "exit code 1");

        const entry = JSON.parse(capturedWrites[0].trim());
        expect(entry.error).toBe("exit code 1");
    });

    it("SUCCESS entry'de error alanı bulunmamalı", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("list", "ls", "SUCCESS");

        const entry = JSON.parse(capturedWrites[0].trim());
        expect(entry.error).toBeUndefined();
    });

    it("CANCELLED entry'de error alanı bulunmamalı", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("cancel", "cmd", "CANCELLED");

        const entry = JSON.parse(capturedWrites[0].trim());
        expect(entry.error).toBeUndefined();
    });

    it("status değerleri doğru yazılmalı", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("a", "cmd", "SUCCESS");
        appendLog("b", "cmd", "FAILED", "err");
        appendLog("c", "cmd", "CANCELLED");

        const statuses = capturedWrites.map((w) => JSON.parse(w.trim()).status);
        expect(statuses).toEqual(["SUCCESS", "FAILED", "CANCELLED"]);
    });

    it("her satır newline ile bitiyor (NDJSON akış formatı)", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("x", "cmd", "SUCCESS");

        expect(capturedWrites[0]).toMatch(/\n$/);
    });

    it("JSON düz metin format DEĞİL (eski format regresyon)", async () => {
        const { appendLog } = await import("../src/utils/logger.js");

        appendLog("list", "ls -la", "SUCCESS");

        const written = capturedWrites[0];
        // Eski format: "[timestamp] | [SUCCESS] | Prompt: ..."
        expect(written).not.toMatch(/^\[.*\] \| \[/);
        // Yeni format: JSON nesnesi
        expect(written.trim()).toMatch(/^\{.*\}$/);
    });
});
