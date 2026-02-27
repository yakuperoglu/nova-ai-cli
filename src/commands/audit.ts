/**
 * Audit Command
 *
 * Displays recent entries from the Nova audit log.
 */

import chalk from "chalk";
import { readLogs, getLogPath } from "../utils/logger.js";
import { theme } from "../utils/theme.js";

export function auditCommand(lines: number = 20): void {
    const logs = readLogs(lines);

    console.log();
    console.log(theme.brand("  📝 Nova Audit Trail (Son İşlemler)"));
    console.log(theme.dim(`  Dosya Konumu: ${getLogPath()}`));
    console.log();

    if (logs.length === 0) {
        console.log(theme.dim("  Henüz kaydedilmiş bir işlem yok."));
    } else {
        logs.forEach(log => {
            // Color code the status part of the log for readability
            let coloredLog = log;
            if (log.includes("[SUCCESS]")) coloredLog = coloredLog.replace("[SUCCESS]", theme.success("[SUCCESS]"));
            if (log.includes("[FAILED]")) coloredLog = coloredLog.replace("[FAILED]", theme.error("[FAILED]"));
            if (log.includes("[CANCELLED]")) coloredLog = coloredLog.replace("[CANCELLED]", theme.warning("[CANCELLED]"));

            console.log("  " + coloredLog);
        });
    }

    console.log();
}
