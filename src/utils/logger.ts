/**
 * Logger Utility
 *
 * Appends executed commands and their status to a local audit log
 * file located at ~/.nova/audit.log.
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LOG_DIR = path.join(os.homedir(), ".nova");
const LOG_FILE = path.join(LOG_DIR, "audit.log");

export type LogStatus = "SUCCESS" | "FAILED" | "CANCELLED";

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
        let logEntry = `[${timestamp}] | [${status}] | Prompt: "${prompt}" | Command: "${command}"`;

        if (status === "FAILED" && errorMessage) {
            logEntry += ` | Error: ${errorMessage}`;
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
