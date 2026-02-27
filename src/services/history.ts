/**
 * History Service
 *
 * Manages the conversational context for Nova CLI.
 * Stores up to MAX_HISTORY messages in ~/.nova/history.json
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Constants ─────────────────────────────────────────────
const HISTORY_DIR = path.join(os.homedir(), ".nova");
const HISTORY_FILE = path.join(HISTORY_DIR, "history.json");
const MAX_HISTORY = 10; // Keep last 10 messages (5 pairs of user/assistant)

// ─── Types ─────────────────────────────────────────────────
export interface HistoryMessage {
    role: "user" | "model";
    parts: { text: string }[];
}

// ─── Helpers ───────────────────────────────────────────────

function ensureHistoryDir(): void {
    if (!fs.existsSync(HISTORY_DIR)) {
        fs.mkdirSync(HISTORY_DIR, { recursive: true, mode: 0o700 });
    }
}

function lockdownHistoryFile(): void {
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(HISTORY_FILE, 0o600);
        } catch {
            // Best-effort
        }
    }
}

// ─── Public API ────────────────────────────────────────────

/**
 * Retrieves the stored conversation history.
 */
export function getHistory(): HistoryMessage[] {
    try {
        if (!fs.existsSync(HISTORY_FILE)) {
            return [];
        }

        const raw = fs.readFileSync(HISTORY_FILE, "utf-8");
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
            return parsed as HistoryMessage[];
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Adds a new message to the history queue.
 * Keeps only the last MAX_HISTORY messages (FIFO).
 */
export function addMessage(role: "user" | "model", text: string): void {
    ensureHistoryDir();

    let history = getHistory();

    history.push({
        role,
        parts: [{ text }]
    });

    // Enforce max history limit
    if (history.length > MAX_HISTORY) {
        history = history.slice(history.length - MAX_HISTORY);
    }

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), "utf-8");
    lockdownHistoryFile();
}

/**
 * Clears the stored conversation history.
 */
export function clearHistory(): void {
    ensureHistoryDir();
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2), "utf-8");
    lockdownHistoryFile();
}
