/**
 * Remember Command — add a new rule to Nova's persistent memory
 */

import { addMemory } from "../services/memory.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

export async function rememberCommand(rule: string): Promise<void> {
    if (!rule || rule.trim() === "") {
        console.log(theme.error(`[FAIL] ${t("remember.empty")}`));
        console.log(theme.dim(`  ${t("remember.emptyExample")}`));
        return;
    }

    const cleanRule = rule.trim();

    try {
        await addMemory(cleanRule);
        console.log();
        console.log(theme.success(`  [OK] ${t("remember.success", { rule: cleanRule })}`));
        console.log(theme.dim(`  ${t("remember.hint")}`));
        console.log();
    } catch {
        console.log(theme.error(`[FAIL] ${t("remember.failed")}`));
    }
}
