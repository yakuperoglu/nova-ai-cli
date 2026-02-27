/**
 * Ask Command
 *
 * Core flow:
 * 1. Take user's natural language prompt
 * 2. Send to AI service (expects { type, message, command } JSON)
 * 3. Display AI's conversational message
 * 4. If type is "chat", exit. (e.g. "selam")
 * 5. If type is "command", validate safety.
 * 6. Display command box and ask for confirmation.
 * 7. Execute the command (or cancel)
 */

import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { translateToCommand, AIResponse } from "../services/ai.js";
import { executeCommand } from "../utils/executor.js";
import { validateCommand, getRiskIcon } from "../utils/security.js";

export async function askCommand(prompt: string): Promise<void> {
    // ─── Validate Input ──────────────────────────────────────
    if (!prompt.trim()) {
        console.log(chalk.red("✖ Please provide a prompt."));
        console.log(chalk.dim('  Example: nova ask "list all files in this folder"'));
        process.exit(1);
    }

    // ─── Call AI Service ─────────────────────────────────────
    const spinner = ora({
        text: chalk.cyan("Nova düşünüyor..."),
        spinner: "dots2",
    }).start();

    let aiResult: AIResponse;

    try {
        aiResult = await translateToCommand(prompt);
        spinner.stop();
    } catch (error) {
        spinner.fail(chalk.red("Failed to reach Nova."));

        if (error instanceof Error) {
            console.log(chalk.red(`  → ${error.message}`));
        } else {
            console.log(chalk.red(`  → An unknown error occurred.`));
        }

        console.log();
        process.exit(1);
    }

    // ─── Display AI Message ─────────────────────────────────
    console.log();
    console.log(chalk.cyanBright("  ✨ Nova: ") + chalk.white(aiResult.message));
    console.log();

    // ─── Chat Only Mode ─────────────────────────────────────
    if (aiResult.type === "chat" || !aiResult.command) {
        // AI decided this doesn't need an action, just a reply.
        return;
    }

    // ─── Security Validation ────────────────────────────────
    const validation = validateCommand(aiResult.command);

    if (validation.level === "blocked") {
        console.log(chalk.red.bold(`  ${getRiskIcon(validation.level)} BLOCKED — Dangerous command detected!`));
        console.log(chalk.red(`  Reason: ${validation.reason}`));
        console.log(chalk.dim("  Nova refused to execute this command for your safety."));
        console.log();
        process.exit(1);
    }

    if (validation.level === "warning") {
        console.log(chalk.yellow(`  ${getRiskIcon(validation.level)} Warning: ${validation.reason}`));
        console.log();
    }

    const riskBadge =
        validation.level === "safe"
            ? chalk.green(` ${getRiskIcon(validation.level)} SAFE `)
            : chalk.yellow(` ${getRiskIcon(validation.level)} CAUTION `);

    // ─── Display Generated Command ──────────────────────────
    console.log(chalk.dim("  ┌─────────────────────────────────────────┐"));
    console.log(
        chalk.dim("  │ ") +
        chalk.yellowBright.bold("$ ") +
        chalk.white.bold(aiResult.command) +
        "  " +
        riskBadge
    );
    console.log(chalk.dim("  └─────────────────────────────────────────┘"));
    console.log();

    // ─── Ask for Confirmation ───────────────────────────────
    try {
        const confirmMessage =
            validation.level === "warning"
                ? chalk.yellow.bold("⚠ Bu komut riskler barındırıyor. Yine de çalıştırılsın mı?")
                : chalk.green("Bu işlemi onaylıyor musun?");

        const shouldExecute = await confirm({
            message: confirmMessage,
            default: true,
        });

        if (!shouldExecute) {
            console.log(chalk.dim("\n  ✖ İşlem iptal edildi.\n"));
            return;
        }
    } catch {
        // User pressed Ctrl+C
        console.log(chalk.dim("\n  ✖ İşlem iptal edildi.\n"));
        return;
    }

    // ─── Execute Command ────────────────────────────────────
    console.log(chalk.dim("\n  ⏳ İşleniyor...\n"));

    try {
        const result = await executeCommand(aiResult.command);

        if (result.stdout) {
            console.log(chalk.white(result.stdout));
        }

        if (result.stderr) {
            console.log(chalk.yellow(result.stderr));
            console.log(chalk.red("\n  ⚠ Komut tamamlandı, ancak bazı uyarılar/hatalar oluştu.\n"));
        } else {
            console.log(chalk.green("\n  ✔ İşlem başarıyla tamamlandı.\n"));
        }

    } catch (error) {
        if (error instanceof Error) {
            console.log(chalk.red(`\n  ✖ Çalıştırma başarısız: ${error.message}\n`));
        }

        process.exit(1);
    }
}
