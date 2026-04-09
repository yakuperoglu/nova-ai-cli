/**
 * Model Command — switch or view the active AI model id
 */

import { setModel, getModel, getProvider, DEFAULT_MODELS } from "../services/config.js";
import { theme } from "../utils/theme.js";
import { t } from "../utils/i18n.js";

export function modelSetCommand(modelName: string): void {
    if (!modelName || modelName.trim() === "") {
        console.log(theme.error(`[FAIL] ${t("model.emptyName")}`));
        return;
    }

    const cleanModel = modelName.trim();
    setModel(cleanModel);

    console.log();
    console.log(theme.success(`  [OK] ${t("model.changeSuccess", { model: cleanModel })}`));
    console.log(theme.dim(`  ${t("model.changeHint")}`));
    console.log();
}

export function modelStatusCommand(): void {
    const currentModel = getModel();
    const p = getProvider();
    const def = DEFAULT_MODELS[p];

    console.log();
    console.log(theme.brand(`  ${t("model.providerLabel", { provider: p })}`));
    console.log(theme.brand(`  ${t("model.currentModel", { model: currentModel })}`));
    console.log(theme.dim(`  ${t("model.defaultModel", { model: def })}`));
    console.log(theme.dim(`  ${t("model.changeCmd")}`));
    console.log();
}
