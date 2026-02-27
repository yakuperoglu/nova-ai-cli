/**
 * Theme Command
 *
 * Lets the user view and switch the UI theme of the Nova CLI.
 */

import chalk from "chalk";
import { setTheme, getTheme } from "../services/config.js";
import { getAvailableThemes, isValidTheme, theme } from "../utils/theme.js";

export function themeSetCommand(themeName: string): void {
    if (!themeName || themeName.trim() === "") {
        console.log(theme.error("[FAIL] Lütfen geçerli bir tema adı girin. Örneğin: 'nova theme set ocean'"));
        return;
    }

    const cleanTheme = themeName.trim().toLowerCase();

    if (!isValidTheme(cleanTheme)) {
        console.log(chalk.red(`[FAIL] '${cleanTheme}' adında bir tema bulunamadı.`));
        console.log(chalk.dim(`  Mümkün temaları görmek için: 'nova theme list'`));
        return;
    }

    setTheme(cleanTheme);

    console.log();
    // After setting the config, we use the `theme` utility immediately to show the user their new style
    console.log(theme.success(`  [OK] Arayüz teması başarıyla güncellendi: `) + theme.brand(cleanTheme));
    console.log(theme.dim(`  Artık çıktılar bu renk şeması üzerinden gösterilecek.`));
    console.log();
}

export function themeListCommand(): void {
    const active = getTheme();
    const allThemes = getAvailableThemes();

    console.log();
    console.log(theme.brand("  Nova Tema Galerisi"));
    console.log(theme.dim("  Yeni bir tema seçmek için: 'nova theme set <isim>'"));
    console.log();

    allThemes.forEach(t => {
        const isCurrent = t === active;
        const pointer = isCurrent ? "→" : " ";

        let label = t;
        if (isCurrent) {
            label = `${t} (aktif)`;
            console.log(theme.brand(`  ${pointer} ${label}`));
        } else {
            // For inactive themes we just print them normally
            console.log(`  ${pointer} ${label}`);
        }
    });

    console.log();
}
