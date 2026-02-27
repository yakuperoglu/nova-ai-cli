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
        console.log(theme.error("[FAIL] Please enter a valid theme name. e.g.: 'nova theme set ocean'"));
        return;
    }

    const cleanTheme = themeName.trim().toLowerCase();

    if (!isValidTheme(cleanTheme)) {
        console.log(chalk.red(`[FAIL] '${cleanTheme}' theme name not found.`));
        console.log(chalk.dim(`  To see available themes: 'nova theme list'`));
        return;
    }

    setTheme(cleanTheme);

    console.log();
    // After setting the config, we use the `theme` utility immediately to show the user their new style
    console.log(theme.success(`  [OK] UI theme updated successfully: `) + theme.brand(cleanTheme));
    console.log(theme.dim(`  Outputs will now be displayed using this color scheme.`));
    console.log();
}

export function themeListCommand(): void {
    const active = getTheme();
    const allThemes = getAvailableThemes();

    console.log();
    console.log(theme.brand("  Nova Theme Gallery"));
    console.log(theme.dim("  To select a new theme: 'nova theme set <name>'"));
    console.log();

    allThemes.forEach(t => {
        const isCurrent = t === active;
        const pointer = isCurrent ? "→" : " ";

        let label = t;
        if (isCurrent) {
            label = `${t} (active)`;
            console.log(theme.brand(`  ${pointer} ${label}`));
        } else {
            // For inactive themes we just print them normally
            console.log(`  ${pointer} ${label}`);
        }
    });

    console.log();
}
