/**
 * Memory Command — view, clear, or remove individual rules
 * in Nova's persistent memory.
 */

import { getMemories, clearMemories, removeMemory } from "../services/memory.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

export async function memoryListCommand(): Promise<void> {
    try {
        const memories = await getMemories();
        if (memories.length === 0) {
            console.log();
            console.log(theme.dim(`  ${t("memory.empty")}`));
            console.log(theme.dim(`  ${t("memory.emptyHint")}`));
            console.log();
            return;
        }

        console.log();
        console.log(theme.brand(`  ${t("memory.title")}`));
        console.log();
        memories.forEach((m, i) => {
            console.log(`  ${theme.brand(`${i + 1}.`)} ${m}`);
        });
        console.log();
    } catch {
        console.log(theme.error(`[FAIL] ${t("memory.readError")}`));
    }
}

export function memoryClearCommand(): void {
    try {
        clearMemories();
        console.log();
        console.log(theme.success(`  [OK] ${t("memory.clearSuccess")}`));
        console.log();
    } catch {
        console.log(theme.error(`[FAIL] ${t("memory.clearError")}`));
    }
}

export async function memoryRemoveCommand(index: string): Promise<void> {
    const idx = parseInt(index, 10);
    if (isNaN(idx) || idx < 1) {
        console.log(theme.error(`[FAIL] ${t("memory.invalidIndex")}`));
        return;
    }

    try {
        const memories = await getMemories();
        const target = memories[idx - 1];
        if (!target) {
            console.log(
                theme.error(`[FAIL] ${t("memory.removeNotFound", { index: String(idx) })}`)
            );
            console.log(theme.dim(`  ${t("memory.removeHint")}`));
            return;
        }

        await removeMemory(idx - 1);
        console.log();
        console.log(theme.success(`  [OK] ${t("memory.removeSuccess", { rule: target })}`));
        console.log();
    } catch {
        console.log(theme.error(`[FAIL] ${t("memory.removeError")}`));
    }
}
