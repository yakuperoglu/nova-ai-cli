/**
 * Persistent Memory Service
 *
 * Manages the user's permanent preferences and rules for Nova CLI.
 * Stores an array of strings in ~/.nova/profile.json
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";

// ─── Constants ─────────────────────────────────────────────
const PROFILE_DIR = path.join(os.homedir(), ".nova");
const PROFILE_FILE = path.join(PROFILE_DIR, "profile.json");

// ─── Helpers ───────────────────────────────────────────────

function ensureProfileDir(): void {
    if (!fs.existsSync(PROFILE_DIR)) {
        fs.mkdirSync(PROFILE_DIR, { recursive: true, mode: 0o700 });
    }
}

function lockdownProfileFile(): void {
    if (process.platform !== "win32") {
        try {
            fs.chmodSync(PROFILE_FILE, 0o600);
        } catch {
            // Best-effort
        }
    }
}

// ─── Public API ────────────────────────────────────────────

/**
 * Retrieves the stored permanent memories/rules.
 */
export function getMemories(): string[] {
    try {
        if (!fs.existsSync(PROFILE_FILE)) {
            return [];
        }

        const raw = fs.readFileSync(PROFILE_FILE, "utf-8");
        const parsed = JSON.parse(raw);

        if (Array.isArray(parsed)) {
            return parsed as string[];
        }
        return [];
    } catch {
        return [];
    }
}

/**
 * Adds a new memory/rule to the persistent profile.
 */
export function addMemory(fact: string): void {
    ensureProfileDir();

    const memories = getMemories();

    // Prevent exactly duplicate rules
    if (!memories.includes(fact.trim())) {
        memories.push(fact.trim());
        fs.writeFileSync(PROFILE_FILE, JSON.stringify(memories, null, 2), "utf-8");
        lockdownProfileFile();
    }
}

/**
 * Clears all persistent memories.
 */
export function clearMemories(): void {
    ensureProfileDir();
    fs.writeFileSync(PROFILE_FILE, JSON.stringify([], null, 2), "utf-8");
    lockdownProfileFile();
}

/**
 * Removes a specific memory by its 0-based index.
 * Returns true if removed, false if the index was invalid.
 */
export function removeMemory(index: number): boolean {
    const memories = getMemories();

    if (index >= 0 && index < memories.length) {
        memories.splice(index, 1);
        fs.writeFileSync(PROFILE_FILE, JSON.stringify(memories, null, 2), "utf-8");
        lockdownProfileFile();
        return true;
    }

    return false;
}
