/**
 * Remember Command
 *
 * Adds a persistent rule/preference to Nova's memory.
 */

import chalk from "chalk";
import { addMemory } from "../services/memory.js";

export function rememberCommand(fact: string): void {
    if (!fact || !fact.trim()) {
        console.log(chalk.red("\n  ✖ Lütfen hatırlamamı istediğiniz kuralı yazın."));
        console.log(chalk.dim('  Örnek: nova remember "Her zaman TypeScript kullan"\n'));
        process.exit(1);
    }

    try {
        addMemory(fact);
        console.log(chalk.green(`\n  ✔ Yeni kural kaydedildi: "${fact}"`));
        console.log(chalk.dim("  Nova bundan sonra tüm komutlarında bu detayı dikkate alacak.\n"));
    } catch (error) {
        console.log(chalk.red("\n  ✖ Kural kaydedilirken bir hata oluştu.\n"));
        if (error instanceof Error) {
            console.log(chalk.red(`  → ${error.message}\n`));
        }
    }
}
