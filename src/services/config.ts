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
export interface NovaConfig {
    apiKey?: string;
    model?: string;
    theme?: string;
}

const DEFAULT_CONFIG: NovaConfig = {
    model: "gemini-2.5-flash",
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

        return { ...DEFAULT_CONFIG, ...parsed };
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
 * Returns the stored API key, or undefined if not set.
 */
export function getApiKey(): string | undefined {
    const config = getConfig();
    return config.apiKey;
}

/**
 * Saves the API key to the global config.
 */
export function setApiKey(apiKey: string): void {
    setConfig({ apiKey });
}

/**
 * Returns the currently active Gemini model.
 * Defaults to 'gemini-2.5-flash' if not specified.
 */
export function getModel(): string {
    const config = getConfig();
    return config.model || "gemini-2.5-flash";
}

/**
 * Saves the preferred Gemini model to the global config.
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
 * Returns the path to the config file (for display purposes).
 */
export function getConfigPath(): string {
    return CONFIG_FILE;
}
