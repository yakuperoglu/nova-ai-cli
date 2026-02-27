/**
 * Audit Command
 *
 * Displays recent entries from the Nova audit log.
 */

import chalk from "chalk";
import { readLogs, getLogPath } from "../utils/logger.js";

export function auditCommand(lines: number = 20): void {
    const logs = readLogs(lines);

    console.log();
    console.log(chalk.blue.bold("  📝 Nova Audit Trail (Son İşlemler)"));
    console.log(chalk.dim(`  Dosya Konumu: ${getLogPath()}`));
    console.log();

    if (logs.length === 0) {
        console.log(chalk.gray("  Henüz kaydedilmiş bir işlem yok."));
    } else {
        logs.forEach(log => {
            // Color code the status part of the log for readability
            let coloredLog = log;
            if (log.includes("[SUCCESS]")) coloredLog = coloredLog.replace("[SUCCESS]", chalk.green("[SUCCESS]"));
            if (log.includes("[FAILED]")) coloredLog = coloredLog.replace("[FAILED]", chalk.red("[FAILED]"));
            if (log.includes("[CANCELLED]")) coloredLog = coloredLog.replace("[CANCELLED]", chalk.yellow("[CANCELLED]"));

            console.log("  " + coloredLog);
        });
    }

    console.log();
}
