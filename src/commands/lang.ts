/**
 * Lang Command — CLI display and AI response language
 *
 * Usage:
 *   nova lang              → show current language
 *   nova lang set en       → switch to English (default)
 *   nova lang set tr       → switch to Turkish
 */

import { setLanguage } from "../services/config.js";
import { t, getLanguage, SUPPORTED_LANGUAGES } from "../utils/i18n.js";
import { theme } from "../utils/theme.js";

export function langSetCommand(lang: string): void {
    const clean = lang.trim().toLowerCase();
    if (!SUPPORTED_LANGUAGES.includes(clean as typeof SUPPORTED_LANGUAGES[number])) {
        console.log(
            theme.error(
                `\n  [FAIL] ${t("lang.invalid", { langs: SUPPORTED_LANGUAGES.join(", ") })}\n`
            )
        );
        return;
    }

    setLanguage(clean);

    console.log();
    console.log(theme.success(`  [OK] ${t("lang.setSuccess", { lang: clean })}`));
    console.log(theme.dim(`  → ${t("lang.hint")}`));
    if (clean !== "en") {
        console.log(theme.dim(`  → ${t("lang.resetHint")}`));
    }
    console.log();
}

export function langStatusCommand(): void {
    const current = getLanguage();
    console.log();
    console.log(theme.brand(`  ${t("lang.current", { lang: current })}`));
    console.log(theme.dim(`  ${t("lang.hint")}`));
    console.log(theme.dim(`  Supported: ${SUPPORTED_LANGUAGES.join(", ")}`));
    console.log(theme.dim("  To change: nova lang set <en|tr>"));
    console.log();
}
