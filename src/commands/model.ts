/**
 * Model Command
 *
 * Allows the user to switch the under-the-hood Google Gemini model.
 * Defaults to: gemini-2.5-flash
 */

import chalk from "chalk";
import { setModel, getModel } from "../services/config.js";

export function modelSetCommand(modelName: string): void {
    if (!modelName || modelName.trim() === "") {
        console.log(chalk.red("✖ Lütfen geçerli bir model adı girin (Örn: gemini-2.5-pro)"));
        return;
    }

    const cleanModel = modelName.trim();
    setModel(cleanModel);

    console.log();
    console.log(chalk.green(`  ✔ Aktif model başarıyla değiştirildi: `) + chalk.cyan.bold(cleanModel));
    console.log(chalk.dim(`  Artık tüm komutlar ve sohbetler bu model üzerinden işlenecek.`));
    console.log();
}

export function modelStatusCommand(): void {
    const currentModel = getModel();

    console.log();
    console.log(chalk.blue("  🧠 Mevcut AI Modeli : ") + chalk.cyan.bold(currentModel));
    console.log(chalk.dim("  Sistemin varsayılan modeli 'gemini-2.5-flash' şeklindedir."));
    console.log(chalk.dim("  Değiştirmek için: 'nova model set <model-adı>'"));
    console.log();
}
