/**
 * Reset Command — clears the current chat history
 * (persistent memory / rules are NOT affected).
 */

import { clearHistory } from "../services/history.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

export async function resetCommand(): Promise<void> {
    try {
        clearHistory();
        console.log();
        console.log(theme.success(`  [OK] ${t("reset.success")}`));
        console.log();
    } catch {
        console.log(theme.error(`[FAIL] ${t("reset.error")}`));
    }
}
