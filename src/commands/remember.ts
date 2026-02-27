/**
 * Remember Command
 *
 * Adds a persistent rule/preference to Nova's memory.
 */

import chalk from "chalk";
import { addMemory } from "../services/memory.js";
import { theme } from "../utils/theme.js";

export function rememberCommand(fact: string): void {
    if (!fact || !fact.trim()) {
        console.log(theme.error("\n  [FAIL] Please type the rule you want me to remember."));
        console.log(theme.dim('  Example: nova remember "Her zaman TypeScript kullan"\n'));
        process.exit(1);
    }

    try {
        addMemory(fact);
        console.log(theme.success(`\n  [OK] New rule saved: "${fact}"`));
        console.log(theme.dim("  Nova will consider this detail in all future commands.\n"));
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Error saving rule.\n"));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}\n`));
        }
    }
}
