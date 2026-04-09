/**
 * Logger Utility
 *
 * Appends executed commands and their status to a local audit log
 * file located at ~/.nova/audit.log.
 *
 * Güvenlik: loga yazmadan önce bilinen secret formatları maskelenir
 * (API key'ler, token'lar, Authorization header değerleri).
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LOG_DIR = path.join(os.homedir(), ".nova");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

export type LogStatus = "SUCCESS" | "FAILED" | "CANCELLED";

// ─── Secret Redaction ──────────────────────────────────────

/**
 * Bilinen secret formatlarını maskeleyen pattern listesi.
 * Her pattern, tüm eşleşmelerin capture group (1) kısmını ****REDACTED**** ile değiştirir.
 */
const REDACTION_PATTERNS: { pattern: RegExp; label: string }[] = [
    // OpenAI / Anthropic / genel sk- anahtarları
    { pattern: /(sk-(?:ant-)?[A-Za-z0-9\-_]{6})[A-Za-z0-9\-_]+/g, label: "sk-***REDACTED***" },
    // Google / Gemini AIza anahtarı
    { pattern: /(AIza[A-Za-z0-9\-_]{4})[A-Za-z0-9\-_]+/g, label: "AIza***REDACTED***" },
    // Bearer token (Authorization header'ı komuta düşerse)
    { pattern: /Bearer\s+([A-Za-z0-9\-_\.]{6})[A-Za-z0-9\-_\.]+/g, label: "Bearer ***REDACTED***" },
    // password= veya token= query string / URL biçimi
    { pattern: /(?:password|token|api[_\-]?key|secret)=([^&\s"']{4})[^&\s"']*/gi, label: "$1***REDACTED***" },
];

/**
 * Metin içindeki bilinen secret formatlarını maskeler.
 * Orijinal string değiştirilmez; maskeli kopya döner.
 */
export function redactSecrets(text: string): string {
    let result = text;
    for (const { pattern, label } of REDACTION_PATTERNS) {
        // Global regex state'ini sıfırla
        pattern.lastIndex = 0;
        result = result.replace(pattern, label);
    }
    return result;
}

/** Ensures the .nova directory exists */
function ensureLogDir(): void {
    if (!fs.existsSync(LOG_DIR)) {
        fs.mkdirSync(LOG_DIR, { recursive: true, mode: 0o700 });
    }
}

/** Set restrictive file permissions on log file (owner-only) */
function lockdownLogFile(): void {
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(LOG_FILE, 0o600);
        } catch {
            // Best-effort
        }
    }
}

/**
 * Appends a log entry to the audit file.
 * Format: [TIMESTAMP] | [STATUS] | Prompt: "..." | Command: "..."
 */
export function appendLog(prompt: string, command: string, status: LogStatus, errorMessage?: string): void {
    try {
        ensureLogDir();

        const timestamp = new Date().toISOString();
        const safePrompt = redactSecrets(prompt);
        const safeCommand = redactSecrets(command);
        let logEntry = `[${timestamp}] | [${status}] | Prompt: "${safePrompt}" | Command: "${safeCommand}"`;

        if (status === "FAILED" && errorMessage) {
            logEntry += ` | Error: ${redactSecrets(errorMessage)}`;
        }

        logEntry += "\n";

        fs.appendFileSync(LOG_FILE, logEntry, "utf-8");
        lockdownLogFile();
    } catch {
        // Silently fail if logging permissions denied so we don't crash the CLI
    }
}

/**
 * Returns the absolute path to the audit log.
 */
export function getLogPath(): string {
    return LOG_FILE;
}

/**
 * Reads the last few lines of the audit log safely.
 */
export function readLogs(limit: number = 20): string[] {
    try {
        if (!fs.existsSync(LOG_FILE)) {
            return [];
        }

        const content = fs.readFileSync(LOG_FILE, "utf-8");
        const lines = content.trim().split("\n");

        // Return only the last N lines
        return lines.slice(-limit);
    } catch {
        return ["[WARN] Error reading log file."];
    }
}
