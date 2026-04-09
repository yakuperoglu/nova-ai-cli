/**
 * Audit Command — view the recent operations log
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

const NOVA_DIR = path.join(os.homedir(), ".nova");
const LOG_FILE = path.join(NOVA_DIR, "audit.log");

export function auditCommand(): void {
    console.log();
    console.log(theme.brand(`  ${t("audit.title")}`));
    console.log(theme.dim(`  ${t("audit.filePath", { path: LOG_FILE })}`));
    console.log();

    if (!fs.existsSync(LOG_FILE)) {
        console.log(theme.dim(`  ${t("audit.empty")}`));
        console.log();
        return;
    }

    const raw = fs.readFileSync(LOG_FILE, "utf-8").trim();
    if (!raw) {
        console.log(theme.dim(`  ${t("audit.empty")}`));
        console.log();
        return;
    }

    const lines = raw.split("\n");
    const recent = lines.slice(-30);

    for (const line of recent) {
        try {
            const entry = JSON.parse(line);
            const status =
                entry.status === "SUCCESS"
                    ? theme.success("[OK]   ")
                    : entry.status === "CANCELLED"
                      ? theme.dim("[SKIP] ")
                      : theme.error("[FAIL] ");
            const timestamp = theme.dim(entry.timestamp || "");
            const prompt = entry.prompt ? theme.brand(`"${entry.prompt}"`) : "";
            const cmd = entry.command ? theme.dim(`→ ${entry.command}`) : "";
            console.log(`  ${status} ${timestamp} ${prompt} ${cmd}`);
        } catch {
            console.log(theme.dim(`  ${line}`));
        }
    }

    console.log();
}
