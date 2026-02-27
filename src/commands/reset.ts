/**
 * Reset Command
 *
 * Clears the conversational memory stored in ~/.nova/history.json
 */

import chalk from "chalk";
import { clearHistory } from "../services/history.js";
import { theme } from "../utils/theme.js";

export function resetCommand(): void {
    try {
        clearHistory();
        console.log(theme.success("\n  ✔ Sohbet geçmişi başarıyla temizlendi. Nova artık önceki konuşmaları hatırlamayacak.\n"));
    } catch (error) {
        console.log(theme.error("\n  ✖ Geçmiş temizlenirken bir hata oluştu.\n"));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}\n`));
        }
    }
}
