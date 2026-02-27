/**
 * Model Command
 *
 * Allows the user to switch the under-the-hood Google Gemini model.
 * Defaults to: gemini-2.5-flash
 */

import chalk from "chalk";
import { setModel, getModel } from "../services/config.js";
import { theme } from "../utils/theme.js";

export function modelSetCommand(modelName: string): void {
    if (!modelName || modelName.trim() === "") {
        console.log(theme.error("[FAIL] Lütfen geçerli bir model adı girin (Örn: gemini-2.5-pro)"));
        return;
    }

    const cleanModel = modelName.trim();
    setModel(cleanModel);

    console.log();
    console.log(theme.success(`  [OK] Active model changed successfully: `) + theme.brand(cleanModel));
    console.log(theme.dim(`  All commands and chats will now be processed using this model.`));
    console.log();
}

export function modelStatusCommand(): void {
    const currentModel = getModel();

    console.log();
    console.log(theme.brand("  Mevcut AI Modeli : ") + theme.brand(currentModel));
    console.log(theme.dim("  Sistemin varsayılan modeli 'gemini-2.5-flash' şeklindedir."));
    console.log(theme.dim("  Değiştirmek için: 'nova model set <model-adı>'"));
    console.log();
}
