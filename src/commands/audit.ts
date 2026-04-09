/**
 * Audit Command — view the recent operations log
 *
 * Options:
 *   --json            Print raw NDJSON entries instead of formatted output
 *   --filter <value>  Filter by status: SUCCESS | FAILED | CANCELLED
 *   --limit <n>       How many entries to show (default: 30)
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

const NOVA_DIR = path.join(os.homedir(), ".nova");
const LOG_FILE = path.join(NOVA_DIR, "audit.log");

export interface AuditEntry {
    timestamp: string;
    status: string;
    prompt: string;
    command: string;
    error?: string;
}

export interface AuditOptions {
    json?: boolean;
    filter?: string;
    limit?: number;
}

function parseEntries(raw: string): AuditEntry[] {
    return raw
        .split("\n")
        .filter((l) => l.trim().length > 0)
        .map((line) => {
            try {
                return JSON.parse(line) as AuditEntry;
            } catch {
                return null;
            }
        })
        .filter((e): e is AuditEntry => e !== null);
}

export function auditCommand(opts: AuditOptions = {}): void {
    const limit = opts.limit ?? 30;
    const filterStatus = opts.filter?.toUpperCase();

    if (!opts.json) {
        console.log();
        console.log(theme.brand(`  ${t("audit.title")}`));
        console.log(theme.dim(`  ${t("audit.filePath", { path: LOG_FILE })}`));
        console.log();
    }

    if (!fs.existsSync(LOG_FILE)) {
        if (!opts.json) {
            console.log(theme.dim(`  ${t("audit.empty")}`));
            console.log();
        }
        return;
    }

    const raw = fs.readFileSync(LOG_FILE, "utf-8").trim();
    if (!raw) {
        if (!opts.json) {
            console.log(theme.dim(`  ${t("audit.empty")}`));
            console.log();
        }
        return;
    }

    let entries = parseEntries(raw);

    if (filterStatus) {
        entries = entries.filter((e) => e.status === filterStatus);
    }

    const recent = entries.slice(-limit);

    if (opts.json) {
        recent.forEach((e) => console.log(JSON.stringify(e)));
        return;
    }

    if (recent.length === 0) {
        console.log(theme.dim(`  ${t("audit.empty")}`));
        console.log();
        return;
    }

    for (const entry of recent) {
        const statusLabel =
            entry.status === "SUCCESS"
                ? theme.success("[OK]   ")
                : entry.status === "CANCELLED"
                  ? theme.dim("[SKIP] ")
                  : theme.error("[FAIL] ");
        const timestamp = theme.dim(entry.timestamp ?? "");
        const prompt = entry.prompt ? theme.brand(`"${entry.prompt}"`) : "";
        const cmd = entry.command ? theme.dim(`→ ${entry.command}`) : "";
        const errorPart = entry.error ? theme.error(`  ✖ ${entry.error}`) : "";
        console.log(`  ${statusLabel} ${timestamp} ${prompt} ${cmd}${errorPart}`);
    }

    console.log();
}
