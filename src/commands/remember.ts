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
        console.log(theme.error("\n  [FAIL] Lütfen hatırlamamı istediğiniz kuralı yazın."));
        console.log(theme.dim('  Örnek: nova remember "Her zaman TypeScript kullan"\n'));
        process.exit(1);
    }

    try {
        addMemory(fact);
        console.log(theme.success(`\n  [OK] Yeni kural kaydedildi: "${fact}"`));
        console.log(theme.dim("  Nova bundan sonra tüm komutlarında bu detayı dikkate alacak.\n"));
    } catch (error) {
        console.log(theme.error("\n  [FAIL] Kural kaydedilirken bir hata oluştu.\n"));
        if (error instanceof Error) {
            console.log(theme.error(`  → ${error.message}\n`));
        }
    }
}
