/**
 * Theme Command — switch or view the active Nova UI theme
 */

import { setTheme, getTheme } from "../services/config.js";
import { theme, getAvailableThemes, isValidTheme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

export function themeSetCommand(name: string): void {
    if (!name || name.trim() === "") {
        console.log(theme.error(`[FAIL] ${t("theme.emptyName")}`));
        return;
    }

    const cleanName = name.trim().toLowerCase();
    if (!isValidTheme(cleanName)) {
        console.log(theme.error(`[FAIL] ${t("theme.notFound", { theme: cleanName })}`));
        console.log(theme.dim(`  ${t("theme.notFoundHint")}`));
        return;
    }

    setTheme(cleanName);
    console.log();
    console.log(theme.success(`  [OK] ${t("theme.setSuccess", { theme: cleanName })}`));
    console.log(theme.dim(`  ${t("theme.setHint")}`));
    console.log();
}

export function themeListCommand(): void {
    const current = getTheme();
    console.log();
    console.log(theme.brand(`  ${t("theme.galleryTitle")}`));
    console.log(theme.dim(`  ${t("theme.galleryHint")}`));
    console.log();
    for (const t_name of getAvailableThemes()) {
        const active = t_name === current ? theme.success(` ${t("theme.activeLabel")}`) : "";
        console.log(`  ${theme.brand(t_name)}${active}`);
    }
    console.log();
}
