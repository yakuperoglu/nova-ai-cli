import type { AIProvider } from "../services/config.js";

/**
 * API anahtarı öneklerinden sağlayıcı tahmini (heuristic).
 * Belirsiz / özel anahtarlarda varsayılan: gemini.
 * Kesin seçim için `nova auth set --provider <ad>` kullanılmalı.
 */
export function inferProviderFromApiKey(raw: string): AIProvider {
    const key = raw.trim();
    if (!key) return "gemini";

    const lower = key.toLowerCase();

    if (lower.startsWith("sk-ant")) {
        return "anthropic";
    }

    if (
        lower.startsWith("sk-proj-") ||
        lower.startsWith("sk-svcacct-") ||
        lower.startsWith("sk-org-") ||
        lower.startsWith("sk-user-") ||
        (lower.startsWith("sk-") && !lower.startsWith("sk-ant"))
    ) {
        return "openai";
    }

    // Yaygın Google API anahtarı öneki (Gemini / AI Studio ile uyumlu)
    if (key.startsWith("AIza")) {
        return "gemini";
    }

    return "gemini";
}
