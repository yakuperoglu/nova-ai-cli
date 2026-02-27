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
            console.log(theme.dim("\n  ℹ Şu anda Nova'nın hafızasında kalıcı bir kural bulunmuyor.\n"));
            console.log(theme.dim('  Yeni kural eklemek için: nova remember "Her zaman TypeScript kullan"'));
            return;
        }

        console.log(theme.brand("\n  🧠 Nova'nın Kalıcı Hafızası:\n"));
        memories.forEach((mem, index) => {
            console.log(`  ${index + 1}. ${mem}`);
        });
        console.log();
    } catch (error) {
        console.log(theme.error("\n  ✖ Hafıza okunurken bir hata oluştu.\n"));
    }
}

export function memoryClearCommand(): void {
    try {
        clearMemories();
        console.log(theme.success("\n  ✔ Kalıcı hafıza başarıyla temizlendi. Nova artık önceki kuralları hatırlamayacak.\n"));
    } catch (error) {
        console.log(theme.error("\n  ✖ Hafıza temizlenirken bir hata oluştu.\n"));
    }
}

export function memoryRemoveCommand(indexArg: string): void {
    try {
        const index = parseInt(indexArg, 10) - 1; // Convert to 0-based index

        if (isNaN(index)) {
            console.log(theme.error("\n  ✖ Lütfen geçerli bir sayı girin. (Örn: nova memory --remove 1)\n"));
            return;
        }

        const memories = getMemories();
        const removedItem = memories[index]; // Save for the success message

        const success = removeMemory(index);

        if (success) {
            console.log(theme.success(`\n  ✔ Kural başarıyla silindi: "${removedItem}"\n`));
        } else {
            console.log(theme.error(`\n  ✖ ${indexArg} numaralı bir kural bulunamadı.\n`));
            console.log(theme.dim("  Mevcut kurallarınızı görmek için: nova memory --list\n"));
        }
    } catch (error) {
        console.log(theme.error("\n  ✖ Kural silinirken bir hata oluştu.\n"));
    }
}
