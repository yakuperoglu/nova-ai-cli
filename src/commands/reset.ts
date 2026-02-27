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
        console.log(theme.success("\n  [OK] Chat history cleared successfully. Nova won't remember previous conversations.\n"));
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Error clearing history.\n"));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}\n`));
        }
    }
}
