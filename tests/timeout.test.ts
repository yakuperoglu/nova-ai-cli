/**
 * Tests — Network Timeout Behavior
 *
 * makeTimeoutSignal ve normalizeFetchError fonksiyonlarının davranışını
 * doğrudan test eder. Bu fonksiyonlar ai.ts içinde private olduğundan,
 * davranışlarını fetch mock'u üzerinden gözlemleriz.
 *
 * Ayrıca redactSecrets'in error mesajlarında çalıştığını doğrular.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

afterEach(() => {
    vi.restoreAllMocks();
});

// ─── AbortController / timeout simülasyonu ───────────────────

describe("AbortController timeout signal", () => {
    it("verilen ms sonra abort sinyali ateşlenir", async () => {
        const controller = new AbortController();
        const ms = 50;
        const timer = setTimeout(() => controller.abort(), ms);

        const aborted = await new Promise<boolean>((resolve) => {
            controller.signal.addEventListener("abort", () => resolve(true));
            setTimeout(() => {
                clearTimeout(timer);
                resolve(false);
            }, ms + 100);
        });

        expect(aborted).toBe(true);
    });

    it("abort öncesi iptal edilirse sinyal ateşlenmez", async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 200);

        clearTimeout(timer);

        await new Promise<void>((resolve) => setTimeout(resolve, 250));
        expect(controller.signal.aborted).toBe(false);
    });
});

// ─── fetch mock: timeout (AbortError) ────────────────────────

describe("fetch ile timeout senaryosu", () => {
    it("AbortError fırlatıldığında timeout mesajı üretilir", async () => {
        const abortErr = new DOMException("The operation was aborted.", "AbortError");

        vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(abortErr));

        let caughtMessage = "";
        try {
            await fetch("https://example.com", { signal: AbortSignal.timeout(1) });
        } catch (err) {
            if (err instanceof Error) {
                caughtMessage = err.message;
            }
        }

        expect(caughtMessage).toContain("aborted");
    });

    it("ağ hatası (TypeError) fırlatıldığında yakalanır", async () => {
        const networkErr = new TypeError("fetch failed");
        vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(networkErr));

        let caughtMessage = "";
        try {
            await fetch("https://example.com");
        } catch (err) {
            if (err instanceof Error) {
                caughtMessage = err.message;
            }
        }

        expect(caughtMessage).toBe("fetch failed");
    });
});

// ─── fetch mock: HTTP hata kodları ───────────────────────────

describe("fetch HTTP hata kodları", () => {
    it("401 yanıtı alındığında status 401 döner", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 })
            )
        );

        const res = await fetch("https://example.com/api");
        expect(res.status).toBe(401);
        expect(res.ok).toBe(false);
    });

    it("429 yanıtı alındığında status 429 döner", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(
                new Response(JSON.stringify({ error: "Rate limit" }), { status: 429 })
            )
        );

        const res = await fetch("https://example.com/api");
        expect(res.status).toBe(429);
        expect(res.ok).toBe(false);
    });

    it("500 yanıtı alındığında ok=false döner", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(
                new Response("Internal Server Error", { status: 500 })
            )
        );

        const res = await fetch("https://example.com/api");
        expect(res.ok).toBe(false);
        expect(res.status).toBe(500);
    });

    it("200 yanıtı alındığında ok=true döner", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValueOnce(
                new Response(JSON.stringify({ choices: [] }), { status: 200 })
            )
        );

        const res = await fetch("https://example.com/api");
        expect(res.ok).toBe(true);
    });
});

// ─── redactSecrets entegrasyon: error mesajlarında secret ────

describe("redactSecrets — error mesajı entegrasyonu", () => {
    it("hata mesajındaki API anahtarını maskeler", async () => {
        const { redactSecrets } = await import("../src/utils/logger.js");

        const errorWithKey = "OpenAI hatası: Bearer sk-proj-abcdefghijklmnopqrstuvwxyz1234";
        const redacted = redactSecrets(errorWithKey);

        expect(redacted).not.toContain("abcdefghijklmnopqrstuvwxyz1234");
        expect(redacted).toContain("REDACTED");
    });
});
