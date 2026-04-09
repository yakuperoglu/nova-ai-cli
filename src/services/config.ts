/**
 * Config Service — Global Configuration Manager
 *
 * Manages user settings (API key, preferences) in a persistent
 * JSON config file stored at ~/.nova/config.json.
 * Works cross-platform (Windows, macOS, Linux).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Paths ─────────────────────────────────────────────────
const CONFIG_DIR = path.join(os.homedir(), ".nova");
const CONFIG_FILE = path.join(CONFIG_DIR, "config.json");

// ─── Types ─────────────────────────────────────────────────
export type AIProvider = "gemini" | "openai" | "anthropic";

const VALID_PROVIDERS: AIProvider[] = ["gemini", "openai", "anthropic"];

export function normalizeProvider(raw: string | undefined): AIProvider {
    const v = (raw || "gemini").toLowerCase();
    return VALID_PROVIDERS.includes(v as AIProvider) ? (v as AIProvider) : "gemini";
}

export const DEFAULT_MODELS: Record<AIProvider, string> = {
    gemini: "gemini-2.5-flash",
    openai: "gpt-4o-mini",
    anthropic: "claude-3-5-haiku-20241022",
};

/**
 * OpenAI-compatible sağlayıcılar için önceden tanımlı base URL'ler.
 * "openai" sağlayıcısıyla bu URL'lerden biri seçildiğinde kendi API anahtarı
 * ve model ismi de değişebilir.
 */
export const OPENAI_COMPATIBLE_PRESETS: Record<string, { baseURL: string; defaultModel: string }> = {
    groq:    { baseURL: "https://api.groq.com/openai/v1",  defaultModel: "llama-3.3-70b-versatile" },
    ollama:  { baseURL: "http://localhost:11434/v1",        defaultModel: "llama3.2" },
    lmstudio:{ baseURL: "http://localhost:1234/v1",         defaultModel: "local-model" },
    together:{ baseURL: "https://api.together.xyz/v1",      defaultModel: "meta-llama/Llama-3-70b-chat-hf" },
};

export interface NovaConfig {
    /** @deprecated Legacy field; Gemini key is also stored here for backward compat. */
    apiKey?: string;
    provider?: AIProvider;
    /** Per-provider API keys */
    providerApiKeys?: Partial<Record<AIProvider, string>>;
    model?: string;
    theme?: string;
    /**
     * Custom base URL for OpenAI-compatible endpoints.
     * When set, the "openai" provider sends requests here.
     * Example: http://localhost:11434/v1 (Ollama), https://api.groq.com/openai/v1 (Groq)
     * Defaults to the official OpenAI API.
     */
    openaiBaseURL?: string;
    /**
     * CLI display language and AI response language.
     * Supported: "en" (English, default) | "tr" (Turkish)
     * Change via: nova lang set <en|tr>
     */
    language?: string;
}

const DEFAULT_CONFIG: NovaConfig = {
    model: DEFAULT_MODELS.gemini,
    theme: "default"
};

// ─── Helpers ───────────────────────────────────────────────

/** Ensure ~/.nova directory exists with restricted permissions */
function ensureConfigDir(): void {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    // Restrict directory to owner-only on Unix systems
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(CONFIG_DIR, 0o700);
        } catch {
            // Best-effort — may fail on some filesystems
        }
    }
}

/** Set restrictive file permissions on config file (owner-only read/write) */
function lockdownConfigFile(): void {
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(CONFIG_FILE, 0o600);
        } catch {
            // Best-effort
        }
    }
}

// ─── Public API ────────────────────────────────────────────

/**
 * Reads the full config from ~/.nova/config.json.
 * Returns defaults if the file doesn't exist yet.
 */
export function getConfig(): NovaConfig {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            return { ...DEFAULT_CONFIG };
        }

        const raw = fs.readFileSync(CONFIG_FILE, "utf-8");
        const parsed = JSON.parse(raw) as Partial<NovaConfig>;

        const merged = { ...DEFAULT_CONFIG, ...parsed };
        merged.provider = normalizeProvider(parsed.provider);
        return merged;
    } catch {
        return { ...DEFAULT_CONFIG };
    }
}

/**
 * Writes a partial config update to ~/.nova/config.json.
 * Merges with existing values — doesn't overwrite unrelated keys.
 * Sets restrictive file permissions (owner-only).
 */
export function setConfig(updates: Partial<NovaConfig>): void {
    ensureConfigDir();

    const current = getConfig();
    const merged = { ...current, ...updates };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), "utf-8");
    lockdownConfigFile();
}

/**
 * Aktif AI sağlayıcısı (varsayılan: gemini — geriye dönük uyumluluk).
 */
export function getProvider(): AIProvider {
    const config = getConfig();
    return normalizeProvider(config.provider);
}

function modelMatchesProvider(model: string, p: AIProvider): boolean {
    const m = model.toLowerCase();
    if (p === "gemini") return m.includes("gemini");
    if (p === "openai") {
        return (
            m.startsWith("gpt-") ||
            m.startsWith("o1") ||
            m.startsWith("o3") ||
            m.startsWith("chatgpt-") ||
            m.startsWith("ft:")
        );
    }
    if (p === "anthropic") return m.includes("claude");
    return true;
}

/**
 * Aktif sağlayıcıyı kaydeder. Mevcut model yeni sağlayıcıyla uyumsuzsa varsayılan modele çeker.
 */
export function setProvider(provider: AIProvider): void {
    const current = getConfig();
    const model = current.model || DEFAULT_MODELS.gemini;
    const updates: Partial<NovaConfig> = { provider };
    if (!modelMatchesProvider(model, provider)) {
        updates.model = DEFAULT_MODELS[provider];
    }
    setConfig(updates);
}

/**
 * Aktif sağlayıcı için kayıtlı API anahtarı (yoksa undefined).
 */
export function getApiKey(): string | undefined {
    const config = getConfig();
    const p = getProvider();
    const named = config.providerApiKeys?.[p];
    if (named) return named;
    if (p === "gemini" && config.apiKey) return config.apiKey;
    return undefined;
}

/**
 * Belirtilen sağlayıcı için API anahtarını kaydeder. `provider` verilmezse aktif sağlayıcı kullanılır.
 */
export function setApiKey(apiKey: string, provider?: AIProvider): void {
    const p = provider ?? getProvider();
    const current = getConfig();
    const providerApiKeys = { ...current.providerApiKeys, [p]: apiKey };
    const updates: Partial<NovaConfig> = { providerApiKeys };
    if (p === "gemini") {
        updates.apiKey = apiKey;
    }
    setConfig(updates);
}

/**
 * Returns the currently active model for the chosen provider.
 */
export function getModel(): string {
    const config = getConfig();
    const p = getProvider();
    const fallback = DEFAULT_MODELS[p];
    return config.model || fallback;
}

/**
 * Saves the preferred model id to the global config.
 */
export function setModel(model: string): void {
    setConfig({ model });
}

/**
 * Returns the currently active UI Theme.
 * Defaults to 'default' if not specified.
 */
export function getTheme(): string {
    const config = getConfig();
    return config.theme || "default";
}

/**
 * Saves the preferred UI Theme to the global config.
 */
export function setTheme(theme: string): void {
    setConfig({ theme });
}

/**
 * Aktif OpenAI-compatible base URL'yi döner.
 * Ayarlanmamışsa resmi OpenAI endpoint'i.
 */
export function getOpenAIBaseURL(): string {
    const config = getConfig();
    return config.openaiBaseURL?.trim() || "https://api.openai.com/v1";
}

/**
 * Özel OpenAI-compatible base URL kaydeder.
 * Boş/undefined geçilirse sıfırlar (resmi OpenAI'a döner).
 */
export function setOpenAIBaseURL(url: string | undefined): void {
    setConfig({ openaiBaseURL: url?.trim() || undefined });
}

/**
 * Returns the configured display/response language (default: "en").
 */
export function getLanguageFromConfig(): string {
    const config = getConfig();
    return config.language || "en";
}

/**
 * Saves the preferred language to the global config.
 */
export function setLanguage(lang: string): void {
    setConfig({ language: lang });
}

/**
 * Returns the path to the config file (for display purposes).
 */
export function getConfigPath(): string {
    return CONFIG_FILE;
}
