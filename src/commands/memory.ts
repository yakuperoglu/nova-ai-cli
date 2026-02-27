/**
 * Memory Command
 *
 * Manages (lists or clears) Nova's persistent preferences.
 */

import chalk from "chalk";
import { getMemories, clearMemories } from "../services/memory.js";

export function memoryListCommand(): void {
    try {
        const memories = getMemories();

        if (memories.length === 0) {
            console.log(chalk.dim("\n  ℹ Şu anda Nova'nın hafızasında kalıcı bir kural bulunmuyor.\n"));
            console.log(chalk.dim('  Yeni kural eklemek için: nova remember "Her zaman TypeScript kullan"'));
            return;
        }

        console.log(chalk.cyanBright("\n  🧠 Nova'nın Kalıcı Hafızası:\n"));
        memories.forEach((mem, index) => {
            console.log(`  ${index + 1}. ${chalk.white(mem)}`);
        });
        console.log();
    } catch (error) {
        console.log(chalk.red("\n  ✖ Hafıza okunurken bir hata oluştu.\n"));
    }
}

export function memoryClearCommand(): void {
    try {
        clearMemories();
        console.log(chalk.green("\n  ✔ Kalıcı hafıza başarıyla temizlendi. Nova artık önceki kuralları hatırlamayacak.\n"));
    } catch (error) {
        console.log(chalk.red("\n  ✖ Hafıza temizlenirken bir hata oluştu.\n"));
    }
}
