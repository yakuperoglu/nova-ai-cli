/**
 * Reset Command
 *
 * Clears the conversational memory stored in ~/.nova/history.json
 */

import chalk from "chalk";
import { clearHistory } from "../services/history.js";

export function resetCommand(): void {
    try {
        clearHistory();
        console.log(chalk.green("\n  ✔ Sohbet geçmişi başarıyla temizlendi. Nova artık önceki konuşmaları hatırlamayacak.\n"));
    } catch (error) {
        console.log(chalk.red("\n  ✖ Geçmiş temizlenirken bir hata oluştu.\n"));
        if (error instanceof Error) {
            console.log(chalk.red(`  → ${error.message}\n`));
        }
    }
}
