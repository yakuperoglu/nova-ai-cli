/**
 * Memory Command
 *
 * Manages (lists or clears) Nova's persistent preferences.
 */

import { getMemories, clearMemories, removeMemory } from "../services/memory.js";
import { theme } from "../utils/theme.js";

export function memoryListCommand(): void {
    try {
        const memories = getMemories();

        if (memories.length === 0) {
            console.log(theme.dim("\n  [INFO] Nova's persistent memory is currently empty.\n"));
            console.log(theme.dim('  To add a new rule: nova remember "Her zaman TypeScript kullan"'));
            return;
        }

        console.log(theme.brand("\n  Nova's Persistent Memory:\n"));
        memories.forEach((mem, index) => {
            console.log(`  ${index + 1}. ${mem}`);
        });
        console.log();
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Error reading memory.\n"));
    }
}

export function memoryClearCommand(): void {
    try {
        clearMemories();
        console.log(theme.success("\n  [OK] Persistent memory cleared successfully. Nova won't remember previous rules.\n"));
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Error clearing memory.\n"));
    }
}

export function memoryRemoveCommand(indexArg: string): void {
    try {
        const index = parseInt(indexArg, 10) - 1; // Convert to 0-based index

        if (isNaN(index)) {
            console.log(theme.error("\n  [FAIL] Please enter a valid number. (e.g.: nova memory --remove 1)\n"));
            return;
        }

        const memories = getMemories();
        const removedItem = memories[index]; // Save for the success message

        const success = removeMemory(index);

        if (success) {
            console.log(theme.success(`\n  [OK] Rule deleted successfully: "${removedItem}"\n`));
        } else {
            console.log(theme.error(`\n  [FAIL] ${indexArg} rule number not found.\n`));
            console.log(theme.dim("  To see existing rules: nova memory --list\n"));
        }
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Error deleting rule.\n"));
    }
}
